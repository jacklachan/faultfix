# Faultline

Faultline is an evidence-first incident investigator: it proves a causal case before it unlocks a suggested fix. This demo uses a fully bundled, deterministic payments incident—no production integrations or API key required.

## Demo

The r42 deployment reduced a database connection pool from 40 to 20. The interface guides an investigator through logs, traces, the deploy diff, configuration, an infrastructure red herring, and a regression test. The proof gate unlocks only when direct evidence, the causal chain, and a reproduction test are all recorded.

## Run

```bash
npm install
npm run dev
npm test
```

## Lineage

This is new Build Week product work. It draws on the team’s experience investigating outage evidence in the 14th-place Meta × PyTorch reinforcement-learning hackathon project, PostmortemEnv / Three Musketeers, but it is not a reskin or resubmission of that project.

## Development note

Codex/GPT-5.6 was used during development to structure the deterministic evidence model, build the interface, and author the test coverage. It is not needed at runtime; the proof engine is the source of truth.
