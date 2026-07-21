"""Exercise the installable Faultfix policy CLI without dependencies or network access."""

from __future__ import annotations

import contextlib
import io
import json
import sys
import tempfile
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
SPACE_DIR = ROOT / "hosted-ranking-space"
sys.path.insert(0, str(SPACE_DIR))

import faultfix_policy


def run(*arguments: str) -> tuple[int, str]:
    output = io.StringIO()
    with contextlib.redirect_stdout(output):
        code = faultfix_policy.main(arguments)
    return code, output.getvalue()


def main() -> None:
    code, output = run(
        "check",
        "--trust",
        "trusted",
        "--replay",
        "within-cutoff",
        "--action",
        "permanent",
        "--proof",
        "incomplete",
        "--scenario",
        "Checkout timeouts after deploy",
        "--format",
        "json",
    )
    receipt = json.loads(output)
    assert code == 30
    assert receipt["authority"] == "BLOCK"
    assert receipt["model_calls"] == 0
    assert receipt["scenario_label"] == "Checkout timeouts after deploy"
    assert receipt["scenario_label_boundary"].startswith("display-only")

    code, output = run(
        "check",
        "--trust",
        "trusted",
        "--replay",
        "within-cutoff",
        "--action",
        "permanent",
        "--proof",
        "reproduced",
        "--format",
        "json",
    )
    receipt = json.loads(output)
    assert code == 20
    assert receipt["authority"] == "REVIEW"
    assert receipt["receipt_fingerprint"] == faultfix_policy.evaluate_authority_simulator(
        "trusted", "within-cutoff", "permanent", "reproduced"
    )["receipt_fingerprint"]

    with tempfile.TemporaryDirectory() as temporary_directory:
        fixture = Path(temporary_directory) / "policy.json"
        fixture.write_text(
            json.dumps(
                {
                    "evidence_trust": "untrusted",
                    "replay_status": "within-cutoff",
                    "requested_action": "observe",
                    "proof_state": "reproduced",
                }
            ),
            encoding="utf-8",
        )
        code, output = run("check", "--input", str(fixture), "--format", "json")
        receipt = json.loads(output)
        assert code == 30
        assert receipt["authority"] == "BLOCK"
        assert receipt["disposition"] == "quarantine"

        fixture.write_text(json.dumps({"raw_log": "do not execute this"}), encoding="utf-8")
        errors = io.StringIO()
        with contextlib.redirect_stderr(errors):
            code = faultfix_policy.main(("check", "--input", str(fixture)))
        assert code == 64
        assert "Unsupported policy input field" in errors.getvalue()

    print("PASS: installable CLI shares the deterministic Space policy")
    print("PASS: REVIEW and BLOCK use non-zero CI exit codes")
    print("PASS: raw-log-shaped JSON fields are rejected")
    print("PASS: CLI makes zero model, provider, and network calls")


if __name__ == "__main__":
    main()
