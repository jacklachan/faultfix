# faultfix

faultfix is an evidence-first incident investigator. It does not offer a fix because a hypothesis sounds plausible: it unlocks the candidate patch only after the causal case and a reproduction are recorded.

This is a self-contained product demo. The payments incident, evidence sources, causal graph, regression result, and receipt are deterministic and bundled in the app—no production systems, credentials, or API keys are required.

## Run locally

```bash
npm install
npm run dev
```

Open the local URL printed by Next.js. Useful verification commands:

```bash
npm test
npm run lint
npm run build
```

## What the demo proves

The simulated incident is `INC-042`: payments fail after deploy `r42` reduces `DATABASE_POOL_LIMIT` from 40 to 20. The evidence sequence is deliberately bounded:

1. Search logs — connection acquisition is exhausted in AZ-A.
2. Inspect trace — auth and payment paths stall at the data-service pool.
3. Compare deploy diff — `r42` contains the pool configuration change.
4. Inspect configuration — the pool limit changed from 40 to 20.
5. Review infrastructure events — the overlapping DNS event is rejected because it occurred in another zone and did not change AZ-A routing.
6. Run regression test — limit 20 reproduces the timeout; 40 resolves it.

The primary button advances one action at a time; the action rail makes the same ordered sequence visible. The proof gate is complete only when all four checks are met: direct symptom evidence, deploy/config evidence, the full causal chain (including the rejected alternative), and a reproduction test. The local model feature cannot satisfy or bypass any of these checks.

## Judge demo script (2–3 minutes)

1. Start the investigation and point out that the patch is locked while the proof gate is empty.
2. Advance through logs and trace to establish the symptom and affected path.
3. Advance through the deploy diff and configuration to connect `r42` to the 40 → 20 pool-limit change.
4. Open **Challenge this conclusion** to show that faultfix records and explains why the tempting DNS explanation fails.
5. Run the regression test. The gate reaches 4/4 and unlocks the candidate patch: restore `DATABASE_POOL_LIMIT=40` while retaining the regression test.
6. Open the **Incident Receipt** and export it. It captures the root cause, confidence, rejected alternative, regression proof, and candidate patch as a text file.
7. Use **Reset investigation** to return to the initial, locked state.

The terminal-style regression proof shown in the interface is a deterministic visualization of the bundled test evidence, not a command that runs against a live service.

## Optional hosted model ranking

Judges can use the public [faultfix ranking Space](https://huggingface.co/spaces/jacklachan/faultfix) without installing Ollama or providing an API key. The proof panel calls its Gradio endpoint only when **Check hosted model** is selected.

The Space runs `google/flan-t5-small` and asks it which of the two bundled hypotheses most directly explains the simulated incident. Its answer becomes a complete displayed order only after the returned ID is validated. The Space itself falls back to the known deterministic order if the model cannot provide a usable answer, and the app does the same if the Space is cold or unavailable.

In every outcome, the ranking is advisory only: it never changes the evidence sequence, proof score, receipt, or fix gate.

## Lineage

faultfix is new Build Week product work. Its team previously placed 14th in the Meta × PyTorch reinforcement-learning hackathon with [PostmortemEnv / Three Musketeers](https://github.com/Auenchanters/Three-Musketeers-FINALS). That project is acknowledged as lineage only; faultfix is a separate, developer-facing evidence and proof-gating workflow, not a reskin or resubmission.

## Development note

Codex/GPT-5.6 was used during development to structure the deterministic evidence model, build the interface, and author test coverage. It is not required at runtime; faultfix’s deterministic proof engine is the source of truth.
