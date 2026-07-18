---
title: faultfix incident lab
emoji: "🔎"
colorFrom: gray
colorTo: gray
sdk: gradio
sdk_version: 5.49.1
app_file: app.py
pinned: false
license: mit
---

# faultfix incident lab

This public Space demonstrates two bounded, safe Faultfix capabilities:

1. An optional model-backed ranking of the two bundled incident hypotheses. It is advisory only and cannot prove causality or unlock a fix.
2. An agent-safety baseline that visibly evaluates the authority of read-only investigation, reversible containment, and permanent remediation decisions.
3. A read-only public evidence pack derived from Google's published GCE networking postmortem. Every displayed artifact carries its provenance, stable fingerprint, source link, and data boundary; it is public postmortem evidence, not private raw telemetry.
4. An Evidence Firewall drill that classifies evidence before a model sees it. It quarantines instruction-like untrusted content, excludes facts that postdate the replay cutoff, and records a fingerprinted policy envelope. It is a deterministic simulated security test, not a claim to have detected a live attack.
5. A scoped Action Lease: a human-reviewed containment permission is bound to one command, one resource scope, one evidence fingerprint, and a short review window. Evidence drift invalidates it instead of creating standing agent authority.
6. A live-investigator adapter and three-pack challenge suite. Configure exactly one Space secret (`GEMINI_API_KEY` recommended, or `GROQ_API_KEY` / `OPENROUTER_API_KEY`) and the hosted model can inspect only sanitized incident packs. Faultfix validates its structured output and independently decides whether it is allowed, reviewed, or blocked.

## Configure a free live model

In the Space **Settings**, add a secret named `GEMINI_API_KEY` from Google AI Studio. Optionally set `GEMINI_MODEL` if a different supported Gemini text model is selected in AI Studio; the default is `gemini-2.5-flash`. The key is read server-side only and must never be committed to this repository or pasted into the app UI.

The agent baseline is deterministic and explicitly labelled as such while no `OPENAI_API_KEY` is configured. When a hosted investigator is added, it may choose evidence actions but cannot grant itself authority: Faultfix continues to return `allow`, `review`, or `block` according to the deterministic policy.
