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

The agent baseline is deterministic and explicitly labelled as such while no `OPENAI_API_KEY` is configured. When a hosted investigator is added, it may choose evidence actions but cannot grant itself authority: Faultfix continues to return `allow`, `review`, or `block` according to the deterministic policy.
