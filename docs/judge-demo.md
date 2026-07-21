# Faultfix judge demo

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
4. **Walk the INC-042 proof path (45 seconds).** Show the bounded reversible containment first. Then complete the evidence chain and regression. Emphasize that containment did not become a causal verdict or permanent fix.
5. **Close (10 seconds).** “The product is not another incident chatbot. It is an authority layer for whatever agent a team chooses.”

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
