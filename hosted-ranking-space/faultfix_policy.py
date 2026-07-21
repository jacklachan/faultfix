"""Offline, deterministic authority policy shared by Faultfix surfaces.

This module deliberately has no model, network, Gradio, or provider dependency.
It can be used by the public Space, local terminals, and CI without turning a
policy preflight into an agent that can execute production changes.
"""

from __future__ import annotations

import argparse
import hashlib
import json
import sys
from pathlib import Path
from typing import Sequence


VERSION = "0.1.0"
AUTHORITY_SIMULATOR_POLICY = "faultfix-authority-simulator/v1"
AUTHORITY_SIMULATOR_DEFAULTS = {
    "evidence_trust": "trusted",
    "replay_status": "within-cutoff",
    "requested_action": "contain",
    "proof_state": "incomplete",
}
AUTHORITY_SIMULATOR_ALLOWED = {
    "evidence_trust": {"trusted", "untrusted"},
    "replay_status": {"within-cutoff", "post-cutoff"},
    "requested_action": {"observe", "contain", "permanent"},
    "proof_state": {"incomplete", "reproduced"},
}
_INPUT_KEYS = frozenset({*AUTHORITY_SIMULATOR_DEFAULTS, "scenario_label"})
_EXIT_CODES = {"ALLOW": 0, "REVIEW": 20, "BLOCK": 30}


def policy_authority(requested_action: str, has_release_evidence: bool, proof_reproduced: bool = False) -> tuple[str, str]:
    """Return the authority decision shared by deterministic and live paths."""
    if requested_action in {"observe", "none"}:
        return "ALLOW", "Read-only investigation is within the boundary."
    if requested_action == "contain" and has_release_evidence:
        return "REVIEW", "Containment is reversible and in scope, but an incident commander must approve the action lease."
    if requested_action == "contain":
        return "BLOCK", "Containment scope is not evidenced yet. Collect a trustworthy release or infrastructure boundary first."
    if requested_action == "permanent" and has_release_evidence and proof_reproduced:
        return "REVIEW", "Causal proof is reproduced, but a permanent change still needs human approval and staged rollout."
    return "BLOCK", "Permanent changes remain blocked until the deterministic causal proof gate and reproduction are complete."


def normalize_simulator_choice(value: object, field: str) -> str:
    """Accept only fixed policy enums and fail closed for malformed values."""
    if isinstance(value, str) and value in AUTHORITY_SIMULATOR_ALLOWED[field]:
        return value
    return {
        "evidence_trust": "untrusted",
        "replay_status": "post-cutoff",
        "requested_action": "permanent",
        "proof_state": "incomplete",
    }[field]


def normalize_scenario_label(value: object) -> str:
    """Keep a user-supplied scenario label bounded and display-only."""
    if not isinstance(value, str):
        return ""
    return " ".join(value.split())[:120]


def evaluate_authority_simulator(
    evidence_trust: object,
    replay_status: object,
    requested_action: object,
    proof_state: object,
) -> dict[str, str]:
    """Evaluate a bounded scenario without consulting a model or provider."""
    trust = normalize_simulator_choice(evidence_trust, "evidence_trust")
    replay = normalize_simulator_choice(replay_status, "replay_status")
    action = normalize_simulator_choice(requested_action, "requested_action")
    proof = normalize_simulator_choice(proof_state, "proof_state")

    # Replay status wins: hindsight cannot gain influence because it is trusted.
    if replay == "post-cutoff":
        disposition = "future"
        evidence_label = "EXCLUDE"
        model_reach = "none"
        model_context = "0 bytes / post-cutoff evidence excluded"
        authority = "BLOCK"
        reason = "The observation falls outside the replay boundary, so it cannot influence this decision."
        next_step = "Use a trustworthy observation captured before the replay cutoff."
        lease = "Not issued"
    elif trust == "untrusted":
        disposition = "quarantine"
        evidence_label = "QUARANTINE"
        model_reach = "none"
        model_context = "0 bytes / untrusted content quarantined"
        authority = "BLOCK"
        reason = "Untrusted content cannot become model context or action authority."
        next_step = "Replace it with a first-party, scope-bound fact before evaluating an action."
        lease = "Not issued"
    else:
        disposition = "admit"
        evidence_label = "ADMIT"
        model_reach = "admitted"
        model_context = "1 normalized, scope-bound fact"
        authority, reason = policy_authority(
            action,
            has_release_evidence=True,
            proof_reproduced=proof == "reproduced",
        )
        if authority == "ALLOW":
            next_step = "Collect the next trustworthy fact without changing production state."
            lease = "Not required"
        elif action == "contain":
            next_step = "Request a narrow, time-bounded containment lease bound to this receipt."
            lease = "Pending human approval"
        elif authority == "REVIEW":
            next_step = "Prepare the smallest staged change packet for human review."
            lease = "Pending human approval"
        else:
            next_step = "Reproduce the causal mechanism before proposing a permanent change."
            lease = "Not issued"

    receipt_input = {
        "action": action,
        "disposition": disposition,
        "policy": AUTHORITY_SIMULATOR_POLICY,
        "proof": proof,
        "replay": replay,
        "trust": trust,
    }
    fingerprint = hashlib.sha256(
        json.dumps(receipt_input, sort_keys=True, separators=(",", ":")).encode("utf-8")
    ).hexdigest()[:12].upper()
    return {
        "authority": authority,
        "disposition": disposition,
        "evidence_label": evidence_label,
        "lease": lease,
        "model_context": model_context,
        "model_reach": model_reach,
        "next_step": next_step,
        "policy": AUTHORITY_SIMULATOR_POLICY,
        "proof": proof,
        "reason": reason,
        "receipt_fingerprint": fingerprint,
        "requested_action": action,
        "replay": replay,
        "trust": trust,
    }


def _load_input(path: Path) -> dict[str, object]:
    try:
        decoded = json.loads(path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError) as error:
        raise ValueError(f"Could not read a JSON policy input from {path}: {error}") from error
    if not isinstance(decoded, dict):
        raise ValueError("Policy input must be a JSON object.")
    unknown = sorted(set(decoded) - _INPUT_KEYS)
    if unknown:
        raise ValueError(f"Unsupported policy input field(s): {', '.join(unknown)}.")
    return decoded


def _receipt_payload(values: dict[str, object]) -> dict[str, object]:
    result = evaluate_authority_simulator(
        values["evidence_trust"],
        values["replay_status"],
        values["requested_action"],
        values["proof_state"],
    )
    scenario = normalize_scenario_label(values.get("scenario_label", ""))
    return {
        "schema_version": "faultfix-cli/v1",
        "runtime": "offline deterministic policy preflight",
        "model_calls": 0,
        "scenario_label": scenario or None,
        "scenario_label_boundary": "display-only; never model context or policy evidence",
        **result,
    }


def _print_text(receipt: dict[str, object]) -> None:
    print(f"FAULTFIX / {receipt['authority']}")
    print(f"Receipt: {receipt['receipt_fingerprint']}  Policy: {receipt['policy']}")
    if receipt["scenario_label"]:
        print(f"Scenario (label only): {receipt['scenario_label']}")
    print(f"Evidence gate: {receipt['evidence_label']}  Requested action: {receipt['requested_action']}")
    print(f"Reason: {receipt['reason']}")
    print(f"Next boundary: {receipt['next_step']}")
    print("Model calls: 0 (offline deterministic policy preflight)")


def _build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        prog="faultfix",
        description="Offline evidence-bound authority preflight for incident agents.",
    )
    parser.add_argument("--version", action="version", version=f"faultfix {VERSION}")
    commands = parser.add_subparsers(dest="command", required=True)
    check = commands.add_parser(
        "check",
        help="evaluate fixed trust, replay, action, and proof attributes",
        description="No model, network, provider, raw-log, or execution path is used.",
    )
    check.add_argument("--input", type=Path, help="JSON object containing only the supported policy fields")
    check.add_argument("--trust", dest="evidence_trust", choices=sorted(AUTHORITY_SIMULATOR_ALLOWED["evidence_trust"]))
    check.add_argument("--replay", dest="replay_status", choices=sorted(AUTHORITY_SIMULATOR_ALLOWED["replay_status"]))
    check.add_argument("--action", dest="requested_action", choices=sorted(AUTHORITY_SIMULATOR_ALLOWED["requested_action"]))
    check.add_argument("--proof", dest="proof_state", choices=sorted(AUTHORITY_SIMULATOR_ALLOWED["proof_state"]))
    check.add_argument("--scenario", dest="scenario_label", help="optional non-sensitive display label; never policy evidence")
    check.add_argument("--format", choices=("text", "json"), default="text", help="receipt output format")
    return parser


def main(argv: Sequence[str] | None = None) -> int:
    """Run the installable offline policy CLI and return a CI-friendly status."""
    parser = _build_parser()
    args = parser.parse_args(argv)
    values: dict[str, object] = dict(AUTHORITY_SIMULATOR_DEFAULTS)
    values["scenario_label"] = ""
    try:
        if args.input:
            values.update(_load_input(args.input))
    except ValueError as error:
        print(f"faultfix: {error}", file=sys.stderr)
        return 64
    for field in (*AUTHORITY_SIMULATOR_DEFAULTS, "scenario_label"):
        value = getattr(args, field, None)
        if value is not None:
            values[field] = value

    receipt = _receipt_payload(values)
    if args.format == "json":
        print(json.dumps(receipt, indent=2, sort_keys=True))
    else:
        _print_text(receipt)
    return _EXIT_CODES[str(receipt["authority"])]


if __name__ == "__main__":
    sys.exit(main())
