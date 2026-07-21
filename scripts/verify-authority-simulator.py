"""Verify the Space policy boundary without starting the app.

This standard-library test selectively loads only the module definitions needed for
the simulator. It poisons every model and provider helper so a future refactor
cannot accidentally turn the no-cost control surface into an inference path.
"""

from __future__ import annotations

import ast
import json
import re
import sys
import types
from collections import Counter
from itertools import product
from pathlib import Path


APP_PATH = Path(__file__).resolve().parents[1] / "hosted-ranking-space" / "app.py"
TARGET = "render_authority_simulator"


def load_simulator_namespace():
    source = APP_PATH.read_text(encoding="utf-8")
    tree = ast.parse(source, filename=str(APP_PATH))
    body = []
    for node in tree.body:
        if isinstance(
            node,
            (
                ast.Import,
                ast.ImportFrom,
                ast.Assign,
                ast.AnnAssign,
                ast.FunctionDef,
                ast.AsyncFunctionDef,
                ast.ClassDef,
            ),
        ):
            body.append(node)
        if isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef)) and node.name == TARGET:
            break
    else:
        raise AssertionError(f"{TARGET} was not found in {APP_PATH}")

    gradio = types.ModuleType("gradio")
    gradio.Request = object
    sys.modules["gradio"] = gradio

    spaces = types.ModuleType("spaces")
    spaces.GPU = lambda fn=None, *args, **kwargs: (
        fn if callable(fn) else lambda decorated: decorated
    )
    sys.modules["spaces"] = spaces

    hub = types.ModuleType("huggingface_hub")
    hub.InferenceClient = object
    sys.modules["huggingface_hub"] = hub

    transformers = types.ModuleType("transformers")
    transformers.pipeline = lambda *args, **kwargs: None
    sys.modules["transformers"] = transformers

    namespace: dict[str, object] = {"__name__": "__authority_simulator_test__"}
    module = ast.Module(body=body, type_ignores=[])
    exec(compile(ast.fix_missing_locations(module), str(APP_PATH), "exec"), namespace)
    return namespace


def attribute(markup: str, name: str) -> str:
    match = re.search(
        rf"\b{re.escape(name)}=([\"'])(.*?)\1",
        markup,
        flags=re.IGNORECASE | re.DOTALL,
    )
    if not match:
        raise AssertionError(f"Missing {name} in receipt:\n{markup}")
    return match.group(2)


def expected_disposition(trust: str, replay: str) -> str:
    # Replay status is evaluated before trust, mirroring the Evidence Firewall.
    if replay == "post-cutoff":
        return "future"
    if trust == "untrusted":
        return "quarantine"
    return "admit"


def expected_authority(disposition: str, action: str, proof: str) -> str:
    if disposition != "admit":
        return "BLOCK"
    if action == "observe":
        return "ALLOW"
    if action == "contain":
        return "REVIEW"
    return "REVIEW" if proof == "reproduced" else "BLOCK"


def main() -> None:
    namespace = load_simulator_namespace()
    calls: list[str] = []

    def poison(name: str):
        def blocked(*args, **kwargs):
            calls.append(name)
            raise AssertionError(f"{name} must never run in Authority Simulator")

        return blocked

    # The simulator must never reserve budget, instantiate a provider client, or
    # invoke either the local ranker or the hosted investigator.
    for name in (
        "ranker",
        "pipeline",
        "warm_ranker",
        "invoke_live_model",
        "invoke_hf_completion",
        "invoke_hf_with_single_fallback",
        "reserve_live_model_budget",
        "configured_hf_model",
        "maximum_hf_attempts",
    ):
        namespace[name] = poison(name)
    namespace["InferenceClient"] = poison("InferenceClient")

    evaluate = namespace["evaluate_authority_simulator"]
    render = namespace[TARGET]
    assert callable(evaluate)
    assert callable(render)

    outcomes: Counter[str] = Counter()
    fingerprints: set[str] = set()
    for trust, replay, action, proof in product(
        ("trusted", "untrusted"),
        ("within-cutoff", "post-cutoff"),
        ("observe", "contain", "permanent"),
        ("incomplete", "reproduced"),
    ):
        result = evaluate(trust, replay, action, proof)
        markup = render(trust, replay, action, proof)
        disposition = expected_disposition(trust, replay)
        authority = expected_authority(disposition, action, proof)
        model_reach = "admitted" if disposition == "admit" else "none"

        assert result["disposition"] == disposition
        assert result["authority"] == authority
        assert result["model_reach"] == model_reach
        assert attribute(markup, "data-authority").upper() == authority
        assert attribute(markup, "data-evidence-disposition").lower() == disposition
        assert attribute(markup, "data-model-reach").lower() == model_reach
        assert attribute(markup, "data-model-calls") == "0"

        fingerprint = attribute(markup, "data-receipt-fingerprint").upper()
        assert re.fullmatch(r"[A-F0-9]{12}", fingerprint), fingerprint
        fingerprints.add(fingerprint)
        outcomes[authority] += 1

    assert outcomes == Counter({"BLOCK": 19, "REVIEW": 3, "ALLOW": 2}), outcomes
    assert len(fingerprints) == 24, "Every simulator state must produce a distinct receipt"

    # Malformed public input fails closed; it cannot select a friendly outcome.
    malformed = evaluate("trusted<script>", "tomorrow", "erase", "verified")
    assert malformed["disposition"] == "future"
    assert malformed["authority"] == "BLOCK"
    assert malformed["model_reach"] == "none"

    # The simulator and live path share the permanent-action rule: reproduction
    # earns human review, never automatic execution. A live pack without
    # reproduced proof remains blocked.
    policy_authority = namespace["policy_authority"]
    assert policy_authority("permanent", True, proof_reproduced=False)[0] == "BLOCK"
    permanent_review = evaluate("trusted", "within-cutoff", "permanent", "reproduced")
    assert policy_authority("permanent", True, proof_reproduced=True) == (
        permanent_review["authority"],
        permanent_review["reason"],
    )

    # A model cannot claim support without citing at least one bounded evidence
    # ID. This is checked before any answer can reach the live UI.
    normalize_live_answer = namespace["normalize_live_answer"]
    uncited_supported = {
        "hypothesis": "pool-limit",
        "claim_status": "supported",
        "next_evidence": "Inspect the release diff.",
        "requested_action": "observe",
        "rationale": "The claim needs a cited fact.",
        "evidence_ids_used": [],
    }
    rejected, accepted = normalize_live_answer(json.dumps(uncited_supported), evidence_count=4)
    assert not accepted
    assert rejected["claim_status"] == "unsupported"
    assert "Never return an empty evidence list for a supported claim." in namespace["LIVE_SYSTEM"]
    assert not calls, f"Simulator touched forbidden inference/provider paths: {calls}"

    print("PASS: 24/24 deterministic simulator states")
    print("PASS: authorities", dict(outcomes))
    print("PASS: zero model/HF/provider calls")
    print("PASS: live-model schema requires cited support and shares permanent-action policy")


if __name__ == "__main__":
    main()
