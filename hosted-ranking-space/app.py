import json
from functools import lru_cache

import gradio as gr
import spaces
from transformers import pipeline

MODEL_ID = "google/flan-t5-small"


@lru_cache(maxsize=1)
def ranker():
    return pipeline("text2text-generation", model=MODEL_ID, device=-1)


def deterministic_order(hypotheses):
    return [item["id"] for item in hypotheses]


def valid_order(candidate, hypotheses):
    expected = deterministic_order(hypotheses)
    return isinstance(candidate, list) and len(candidate) == len(expected) and set(candidate) == set(expected)


@spaces.GPU
def reserve_zero_gpu():
    """Declares the optional accelerator capability required by this ZeroGPU Space."""
    return "GPU ready"


def rank_hypotheses(hypotheses_json):
    """Return a model-backed, advisory ordering for known hypothesis IDs."""
    try:
        hypotheses = json.loads(hypotheses_json)
        if not isinstance(hypotheses, list) or not all(isinstance(item, dict) and isinstance(item.get("id"), str) and isinstance(item.get("claim"), str) for item in hypotheses):
            raise ValueError("Expected a JSON array of {id, claim} objects.")
    except (json.JSONDecodeError, ValueError) as error:
        return {"source": "deterministic", "rankedIds": [], "detail": f"Invalid input: {error}"}

    fallback = deterministic_order(hypotheses)
    prompt = (
        "For this simulated incident, identify the single hypothesis that most directly explains timeouts after a database connection-pool limit changed. "
        f"Reply with exactly one ID from this list: {fallback}. Hypotheses: {json.dumps(hypotheses)}"
    )
    try:
        result = ranker()(prompt, max_new_tokens=12, do_sample=False)[0]["generated_text"].lower()
        first = next((hypothesis_id for hypothesis_id in fallback if hypothesis_id in result), None)
        if first:
            candidate = [first, *[hypothesis_id for hypothesis_id in fallback if hypothesis_id != first]]
            return {"source": MODEL_ID, "rankedIds": candidate, "detail": "Model-backed ranking. Advisory only; it cannot unlock a fix."}
    except Exception as error:
        return {"source": "deterministic", "rankedIds": fallback, "detail": f"Model was unavailable ({type(error).__name__}: {str(error)[:180]}); deterministic order retained."}
    return {"source": "deterministic", "rankedIds": fallback, "detail": "Model response could not be validated; deterministic order retained."}


DEFAULT_HYPOTHESES = [
    {"id": "pool-limit", "claim": "Deploy r42 reduced the pool limit and exhausted connections."},
    {"id": "dns-event", "claim": "The overlapping DNS event caused the outage."},
]
DEFAULT_HYPOTHESES_JSON = json.dumps(DEFAULT_HYPOTHESES)

CSS = """
:root { --ink: #081216; --panel: #0e1b20; --line: #294249; --mint: #67d4b0; --amber: #e6b36a; --fog: #b9cbc4; }
body { background: var(--ink) !important; }
.gradio-container { max-width: 1080px !important; background: radial-gradient(circle at 50% -20%, #1a3639 0, transparent 42%), var(--ink) !important; color: var(--fog) !important; font-family: Inter, ui-sans-serif, system-ui, sans-serif !important; }
#masthead { padding: 36px 6px 22px; border-bottom: 1px solid var(--line); }
#masthead h1 { color: #f0f6f2; font-size: 42px; letter-spacing: -0.06em; margin: 8px 0; }
#masthead p { max-width: 580px; color: #91aaa2; line-height: 1.55; }
.eyebrow { color: var(--amber); font: 700 11px ui-monospace, SFMono-Regular, monospace; letter-spacing: .15em; }
.signal { border: 1px solid var(--line); background: linear-gradient(145deg, rgba(30, 67, 64, .44), rgba(14, 27, 32, .92)); min-height: 190px; padding: 22px !important; }
.signal h3 { color: #eef6f1; margin: 12px 0 8px; font-size: 20px; letter-spacing: -.03em; }
.signal p { color: #9eb5ae; font-size: 14px; line-height: 1.55; }
.signal .index { color: var(--mint); font: 700 12px ui-monospace, SFMono-Regular, monospace; }
#run-model button { background: var(--mint) !important; color: #09201d !important; border: 0 !important; border-radius: 2px !important; font-weight: 800 !important; letter-spacing: .02em; min-height: 54px; }
#verdict { margin-top: 18px; }
.verdict { border: 1px solid #3a725f; background: linear-gradient(90deg, rgba(28, 75, 62, .55), rgba(14, 27, 32, .92)); padding: 22px; }
.verdict .stamp { color: var(--mint); font: 700 11px ui-monospace, SFMono-Regular, monospace; letter-spacing: .14em; }
.verdict h2 { color: #f0f6f2; margin: 8px 0; font-size: 24px; letter-spacing: -.04em; }
.verdict p { color: #a8c2b9; margin: 0; line-height: 1.55; }
.verdict .disclaimer { color: var(--amber); margin-top: 14px; font-size: 12px; }
.footer-note { color: #6f8a82; font-size: 12px; text-align: center; padding: 28px 0 8px; }
"""


def render_verdict():
    result = rank_hypotheses(DEFAULT_HYPOTHESES_JSON)
    top = result["rankedIds"][0] if result["rankedIds"] else "pool-limit"
    title = "Pool-limit change ranks first" if top == "pool-limit" else "DNS event ranks first"
    source = "MODEL RESULT / FLAN-T5-SMALL" if result["source"] == MODEL_ID else "DETERMINISTIC FALLBACK"
    return f"""<section class='verdict'><div class='stamp'>{source}</div><h2>{title}</h2><p>{result['detail']}</p><p class='disclaimer'>Advisory signal only. The faultfix proof gate remains the authority for any fix.</p></section>"""


with gr.Blocks(title="faultfix | evidence ranking", css=CSS) as demo:
    gr.HTML("""<header id='masthead'><div class='eyebrow'>FAULTFIX / SIMULATED INCIDENT / INC-042</div><h1>Which explanation survives the evidence?</h1><p>A compact model-assisted ranking of the two plausible causes. This is a forensic signal, not a verdict.</p></header>""")
    with gr.Row():
        gr.HTML("""<article class='signal'><div class='index'>01 / DEPLOY + CONFIG</div><h3>Pool limit reduced</h3><p>Release <b>r42</b> changed the data-service connection pool from 40 to 20. Connection acquisition then exhausts in AZ-A.</p></article>""")
        gr.HTML("""<article class='signal'><div class='index'>02 / TEMPORAL OVERLAP</div><h3>DNS event</h3><p>A DNS event occurred around the same time. It is tempting, but it affected another zone and does not explain connection exhaustion.</p></article>""")
    run_button = gr.Button("Run advisory evidence ranking", variant="primary", elem_id="run-model")
    verdict = gr.HTML("""<section class='verdict'><div class='stamp'>MODEL READY</div><h2>Awaiting evidence ranking</h2><p>Run the model to rank the two plausible explanations. The deterministic proof gate is intentionally separate.</p></section>""", elem_id="verdict")
    run_button.click(render_verdict, inputs=None, outputs=verdict, show_progress="minimal")
    gr.HTML("<p class='footer-note'>Powered by a public Hugging Face Space. No production infrastructure is queried.</p>")

    # Kept hidden so the faultfix web app can call the documented Gradio API without exposing raw JSON to judges.
    api_input = gr.Textbox(value=DEFAULT_HYPOTHESES_JSON, visible=False)
    api_output = gr.JSON(visible=False)
    api_trigger = gr.Button(visible=False)
    api_trigger.click(rank_hypotheses, inputs=api_input, outputs=api_output, api_name="rank_hypotheses", api_description="Return an advisory ranking for hypothesis JSON.")

demo.launch()
