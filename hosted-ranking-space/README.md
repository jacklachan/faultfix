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

This public Space demonstrates several bounded, safe Faultfix capabilities:

1. An optional model-backed ranking of the two bundled incident hypotheses. It is advisory only and cannot prove causality or unlock a fix.
2. An agent-safety baseline that visibly evaluates the authority of read-only investigation, reversible containment, and permanent remediation decisions.
3. A read-only public evidence pack derived from Google's published GCE networking postmortem. Every displayed artifact carries its provenance, stable fingerprint, source link, and data boundary; it is public postmortem evidence, not private raw telemetry.
4. An Evidence Firewall drill that classifies evidence before a model sees it. It quarantines instruction-like untrusted content, excludes facts that postdate the replay cutoff, and records a fingerprinted policy envelope. It is a deterministic simulated security test, not a claim to have detected a live attack.
5. A scoped Action Lease: a human-reviewed containment permission is bound to one command, one resource scope, one evidence fingerprint, and a short review window. Evidence drift invalidates it instead of creating standing agent authority.
6. A live-investigator adapter and four-pack challenge suite spanning capacity, DNS, identity rotation, and adversarial evidence. Configure `HF_TOKEN` for Hugging Face Inference Provider billing; the hosted model can inspect only sanitized incident packs. Faultfix validates its structured output and independently decides whether it is allowed, reviewed, or blocked.

## Configure the live model

In the Space **Settings**, add a secret named `HF_TOKEN` with a Hugging Face User Access Token that can call **Inference Providers**. The Space uses Hugging Face Inference Providers and bills your Hugging Face credits. Its default is `Qwen/Qwen3-235B-A22B-Instruct-2507`, with `deepseek-ai/DeepSeek-V3-0324` as an automatic server-side fallback if the preferred model is unavailable **or returns an invalid schema**. `HF_MODEL` and `HF_FALLBACK_MODEL` can override those choices. The adapter never reveals raw provider errors or unvalidated model text. The token is read server-side only and must never be committed to this repository or pasted into the app UI.

The public UI applies shared concurrency, an eight-second provider timeout, and short per-session, shared-window, and runtime model-call budgets before paid inference begins. This keeps the four-pack challenge within its advertised roughly 25-second window and prevents the Space from becoming an open model relay; the deterministic safety demonstrations remain available if a budget is reached.

The agent baseline is deterministic and explicitly labelled as such. A configured hosted investigator may choose evidence actions, but it cannot grant itself authority: Faultfix continues to return `allow`, `review`, or `block` according to the deterministic policy.
