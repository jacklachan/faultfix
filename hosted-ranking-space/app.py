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


with gr.Blocks(title="faultfix ranking service") as demo:
    gr.Markdown("# faultfix ranking service\nOptional model-backed hypothesis ranking for the simulated faultfix incident. This output is advisory only.")
    input_json = gr.Textbox(label="Hypotheses (JSON)", lines=8, value='[{"id":"pool-limit","claim":"Deploy r42 reduced the pool limit and exhausted connections."},{"id":"dns-event","claim":"The overlapping DNS event caused the outage."}]')
    output_json = gr.JSON(label="Advisory ranking")
    gr.Button("Rank hypotheses").click(rank_hypotheses, inputs=input_json, outputs=output_json, api_name="rank_hypotheses")

demo.launch()
