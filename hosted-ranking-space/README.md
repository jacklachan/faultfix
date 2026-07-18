---
title: faultfix ranking service
emoji: "🔎"
colorFrom: gray
colorTo: gray
sdk: gradio
sdk_version: 5.49.1
app_file: app.py
pinned: false
license: mit
---

# faultfix ranking service

This public Hugging Face Space provides an optional, model-backed ranking of the two bundled faultfix incident hypotheses. It is advisory only: it does not prove causality or unlock a fix.

The service runs `google/flan-t5-small` on a constrained prompt and returns a complete ordering of the supplied IDs. If the model response cannot be validated, it returns the supplied deterministic order instead.
