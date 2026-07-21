# Faultfix judge demo

## Record this instead: 100 seconds, no live-model risk

Use this version for the submission video. It only uses deterministic controls, so it works even if a model provider is slow or unavailable. Before recording, open the [live Space](https://huggingface.co/spaces/jacklachan/faultfix) and press `Ctrl` + `+` twice to make the text comfortably large.

1. **0:00 — Start at the top.** Say: “Hi. This is Faultfix. AI agents can investigate an outage, but they should not be able to give themselves permission to change production. Faultfix is the layer that makes them earn that permission.”
2. **0:15 — Scroll to `01 / PROVE THE CONTROL`; click `Block a hostile production command`.** Say: “I built Faultfix with Codex and GPT-5.6. I used them to build the interface, policy engine, automated tests, and this deployed demo. They helped build it; they do not decide production actions.”
3. **0:31 — Point at `QUARANTINE` and `BLOCK`.** Say: “This ticket asks the agent to make a global production change. Faultfix quarantines it before the agent can see it, and the action is blocked. No model call is required for this safety decision.”
4. **0:48 — Scroll to `01B / SIMULATE AUTHORITY`; under `Requested action`, choose `Make a permanent change`; leave `Causal proof` on `Incomplete`; click `Evaluate authority`.** Say: “Here I am asking for a permanent change with incomplete proof. The policy blocks it. Faultfix, not the model, makes that decision.”
5. **1:08 — Under `Causal proof`, choose `Reproduced`; click `Evaluate authority` again.** Say: “Now the proof is reproduced. Even then, Faultfix does not make the change automatically. It moves the request to human review.”
6. **1:25 — Hold on the receipt.** Say: “That is Faultfix: a model can recommend and investigate, but it can never authorize itself. Faultfix sits underneath any incident agent to protect production decisions. Thank you.”

Do not use **Run live investigator** or **Run four-pack challenge suite** in the recording. They are optional model demonstrations, not the clearest proof of the product.

## The one sentence

**An AI agent must earn the right to act.**

Faultfix lets a model investigate, but only trusted, time-bounded evidence can influence it—and a deterministic policy still decides whether an action is allowed, reviewed, or blocked.

## One-slide positioning

**Title:** The missing authority layer for AI operations

| The market is building | Faultfix adds |
| --- | --- |
| Agents that investigate and operate production | A governor that makes them earn the right to act |
| Model recommendations | Evidence trust, replay boundaries, and output validation |
| Broad standing permissions | Scoped, time-bounded Action Leases |
| “Autonomous remediation” | Allow / Review / Block at the action boundary |

Say: “Resolve’s $1B valuation proves the operations-agent market is real. Faultfix does not compete to be another investigator. It is the authority layer beneath every investigator.” [Resolve AI funding announcement](https://resolve.ai/news/resolveai-raises-125-million-series-a)

The credibility anchors are OWASP’s excessive-agency guidance and DeepMind’s CaMeL direction: approval for state-changing actions, separation of untrusted retrieved data from control flow, and conventional policy enforcement around an LLM. [OWASP](https://owasp.org/www-project-top-10-for-large-language-model-applications/2_0_vulns/LLM06_ExcessiveAgency.html) · [CaMeL](https://arxiv.org/abs/2503.18813)

**Roadmap sentence:** “Any agent, any tools—Faultfix becomes the MCP policy gateway that issues evidence-bound leases before production actions.”

## Two-minute run of show

1. **Open with failure (15 seconds).** “An agent sees a DNS blip, follows an untrusted ticket, and proposes a global production change. The problem is not that the agent was unintelligent. Nothing made it earn the right to act.”
2. **Run “block a hostile production command” (20 seconds).** Point out the hostile ticket, the `0` ticket bytes admitted to model context, and the permanent global action marked `BLOCK`. This is deterministic pre-inference enforcement, so it costs nothing and makes no model call.
3. **Run the four-pack live challenge suite when a hosted provider is configured (30 seconds).** Say: “The live model can work across capacity, DNS, identity, and insufficient-evidence cases. It suggests; Faultfix governs.” Highlight that the injection case is quarantined, while every answer is schema-validated. If the provider is unavailable, lead with the deterministic hostile-ticket block and authority trace instead; the product never fabricates a model result.
4. **Walk the INC-042 proof path (40 seconds).** Show the bounded reversible containment first. Then complete the evidence chain and regression. Emphasize that containment did not become a causal verdict or permanent fix.
5. **Explain the build (5 seconds).** “We used Codex with GPT-5.6 to turn this authority model into the interface, test harnesses, and deployed Hugging Face demo.”
6. **Close (10 seconds).** “The product is not another incident chatbot. It is an authority layer for whatever agent a team chooses.”

## Required build-process voiceover

Use step 5 above. It satisfies the submission requirement while keeping the full run-of-show at two minutes. This describes development use only; Codex/GPT-5.6 is not a hidden runtime dependency of Faultfix.

## Authority Simulator moment

After the hostile-ticket block, take 15 seconds to make the policy visible: set the requested action to `permanent` while causal proof is `incomplete` and it stays `BLOCK`; switch only proof to `reproduced` and it reaches `REVIEW`, never automatic execution. Point to `model calls: 0` and the receipt fingerprint. It is a deterministic control surface, so it does not consume Hugging Face credit.

## Hostile judge answers

**Public-source evidence?**

“Faultfix’s case library contains bounded, source-linked facts from Google Cloud and Cloudflare postmortems. It labels them as read-only public evidence, never claims private telemetry, and never lets raw source text become model input or action authority.”

**“Isn’t the incident scripted?”**

“The incidents are transparent fixtures. The controls are the product: the firewall builds the model context, the live model runs against it, model output is schema-validated, and the policy independently governs every action. Run the attack trace or four-pack suite to inspect that boundary.”

**“Is prompt injection just regex?”**

“No. Pattern detection is illustrative. The enforcement boundary is the trust taxonomy and replay policy: untrusted raw text is quarantined by default and never becomes model context or authority.”

**“Why not let the agent fix it automatically?”**

“Because a plausible diagnosis is not proof. Faultfix allows investigation, routes bounded containment to human review, and blocks permanent writes until the causal evidence and reproduction exist.”
