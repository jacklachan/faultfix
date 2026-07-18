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
6. A live-investigator adapter and three-pack challenge suite. Configure exactly one Space secret (`HF_TOKEN` preferred for Hugging Face Inference Provider billing, or `GEMINI_API_KEY`, `GROQ_API_KEY`, or `OPENROUTER_API_KEY`) and the hosted model can inspect only sanitized incident packs. Faultfix validates its structured output and independently decides whether it is allowed, reviewed, or blocked.

## Configure the live model

In the Space **Settings**, add a secret named `HF_TOKEN` with an Hugging Face User Access Token that has inference permission. The Space will use Hugging Face Inference Providers and bill your Hugging Face credits. Its default is `openai/gpt-oss-120b`, with `deepseek-ai/DeepSeek-V3-0324` as an automatic server-side fallback if the preferred model is unavailable. `HF_MODEL` and `HF_FALLBACK_MODEL` can override those choices. If no HF token is present, `GEMINI_API_KEY` is also supported as a free-tier fallback. All keys are read server-side only and must never be committed to this repository or pasted into the app UI.

The agent baseline is deterministic and explicitly labelled as such while no `OPENAI_API_KEY` is configured. When a hosted investigator is added, it may choose evidence actions but cannot grant itself authority: Faultfix continues to return `allow`, `review`, or `block` according to the deterministic policy.
