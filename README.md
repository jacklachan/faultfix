# faultfix

faultfix is an evidence-first incident investigator for the distinction on-call teams actually need: **contain impact now** with a bounded, reversible action; **make a permanent change later** only after the causal case and a reproduction are recorded. A plausible hypothesis never becomes a root-cause verdict or permanent fix by itself.

This is a self-contained product demo. The payments incident, evidence sources, causal graph, regression result, containment packet, and prevention guardrail are deterministic and bundled in the app. No production systems, credentials, or API keys are required.

## Run locally

```bash
npm install
npm run dev
```

Open the local URL printed by Next.js. Verify with:

```bash
npm test
npm run lint
npm run build
```

## What the demo proves

The simulated incident is `INC-042`: payments fail after deploy `r42` reduces `DATABASE_POOL_LIMIT` from 40 to 20. The bounded evidence sequence is:

1. Search logs: connection acquisition is exhausted in AZ-A.
2. Inspect trace: auth and payment paths stall at the data-service pool.
3. Compare deploy diff: `r42` contains the pool configuration change.
4. Inspect configuration: the pool limit changed from 40 to 20.
5. Review infrastructure events: the overlapping DNS event is rejected because it occurred in another zone and did not change AZ-A routing.
6. Run the regression test: limit 20 reproduces the timeout; 40 resolves it.

After the deploy diff confirms r42 is in scope, Faultfix offers a distinct **reversible containment packet**: pause r42 promotion and drain AZ-A traffic from r42 instances. It is approval-gated, time-boxed, scoped to the affected release, and requires an evidence snapshot before action. Applying it records *impact contained*, not *cause established*; the permanent-fix, receipt, and prevention paths remain locked.

The proof gate is complete only when all four checks are met: direct symptom evidence, deploy/config evidence, the full causal chain (including the rejected alternative), and a reproduction test. The optional hosted model cannot satisfy or bypass any of these checks.

## Agent safety lab

**Run agent lab** plays a transparent deterministic baseline through the same incident. It is not presented as AI: the trace is labelled `Scripted / no model key`. Its purpose is to show the policy Faultfix will enforce around a future hosted investigator:

- Read-only evidence actions are allowed.
- Reversible containment is sent to human review only after a recent release is evidenced.
- Permanent remediation is blocked until the causal proof gate passes, then remains human-approved and staged.

The authority engine is shared policy, not model output. The hosted Space can use a server-side `GEMINI_API_KEY` (recommended free option), `GROQ_API_KEY`, or `OPENROUTER_API_KEY` for its live investigator. The model selects an advisory next step from sanitized evidence while Faultfix continues to determine whether each one is allowed, reviewed, or blocked.

## Evidence Firewall

Before an agent receives an evidence pack, Faultfix applies a separate **Evidence Firewall**. Each artifact carries a stable content fingerprint, source trust class, and observation time. The firewall admits normalized records from trusted sources, quarantines untrusted or instruction-like material so its raw text cannot become model context, and excludes any fact that appeared after the replay cutoff. It then produces a small policy receipt with the evidence-pack fingerprint, admitted artifacts, and excluded artifacts.

This prevents two common ways an incident demo can become unsafe or misleading: a hostile string in a log/ticket influencing the agent, and a model benefiting from facts that were unavailable at the moment of the decision. The firewall is additive: passing it does not prove causality and cannot unlock a permanent change. Faultfix still requires the independent causal proof gate and human review.

Human review issues a narrow **Action Lease**, not standing agent permission. A lease binds one containment command, its exact resource scope, the reviewed evidence fingerprint, and a short review window. It automatically becomes stale when the evidence pack changes, forcing the agent to pause for re-authorization rather than applying an old approval to a changed incident.

## Judge demo script (2-3 minutes)

1. Start the investigation and point out that permanent fixes are locked while the proof gate is empty.
2. Advance through logs and trace to establish the symptom and affected path.
3. Advance through the deploy diff, then open **Containment packet**. Show that Faultfix can record a human-approved AZ-A traffic drain while saying plainly that this is *not* a root-cause verdict. Approve the simulated containment and show that proof remains incomplete.
4. Inspect configuration, then open **Challenge this conclusion** to show why the tempting DNS explanation fails.
5. Run the regression test. The gate reaches 4/4 and unlocks the permanent candidate patch: restore `DATABASE_POOL_LIMIT=40` while retaining the regression test.
6. Open the **Incident Receipt**, **causal certificate**, and **causal guardrail**. Change the r43 pool limit to `20` and show the proved mechanism is blocked before delivery.
7. Use **Reset investigation** to return to the initial state.

The terminal-style regression proof is a deterministic visualization of bundled test evidence, not a command that runs against a live service.

## Optional hosted model ranking

Judges can use the public [faultfix ranking Space](https://huggingface.co/spaces/jacklachan/faultfix) without installing Ollama or providing an API key. The proof panel calls its Gradio endpoint only when **Check hosted model** is selected.

The Space runs `google/flan-t5-small` for its zero-key ranking fallback and can use a configured external model for the live investigator and three-pack challenge suite. All model output is advisory only: it never changes the evidence sequence, proof score, containment authority, receipt, or permanent-fix gate. The Space and app both fall back safely if a model response is unusable or unavailable.

## Lineage

faultfix is new Build Week product work. Its team previously placed 14th in the Meta x PyTorch reinforcement-learning hackathon with [PostmortemEnv / Three Musketeers](https://github.com/Auenchanters/Three-Musketeers-FINALS). That project is acknowledged as lineage only; faultfix is a separate, developer-facing evidence and proof-gating workflow, not a reskin or resubmission.

## Development note

Codex/GPT-5.6 was used during development to structure the deterministic evidence model, build the interface, and author test coverage. It is not required at runtime; faultfix's deterministic proof engine is the source of truth.
