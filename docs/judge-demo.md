# Faultfix judge demo

## The one sentence

**An AI agent must earn the right to act.**

Faultfix lets a model investigate, but only trusted, time-bounded evidence can influence it—and a deterministic policy still decides whether an action is allowed, reviewed, or blocked.

## Two-minute run of show

1. **Open with failure (15 seconds).** “An agent sees a DNS blip, follows an untrusted ticket, flushes production DNS globally, and doubles the outage. The problem is not that the agent was unintelligent. Nothing made it earn the right to act.”
2. **Run “block a hostile production command” (20 seconds).** Point out the hostile ticket, the `0` ticket bytes admitted to model context, and the permanent global action marked `BLOCK`. This is deterministic pre-inference enforcement, so it costs nothing and makes no model call.
3. **Run the four-pack live challenge suite (30 seconds).** Say: “Now the live model works across capacity, DNS, identity, and insufficient-evidence cases. It suggests; Faultfix governs.” Highlight that the injection case is quarantined, while every answer is schema-validated.
4. **Walk the INC-042 proof path (45 seconds).** Show the bounded reversible containment first. Then complete the evidence chain and regression. Emphasize that containment did not become a causal verdict or permanent fix.
5. **Close (10 seconds).** “The product is not another incident chatbot. It is an authority layer for whatever agent a team chooses.”

## Hostile judge answers

**“Isn’t the incident scripted?”**

“The incidents are transparent fixtures. The controls are the product: the firewall builds the model context, the live model runs against it, model output is schema-validated, and the policy independently governs every action. Run the attack trace or four-pack suite to inspect that boundary.”

**“Is prompt injection just regex?”**

“No. Pattern detection is illustrative. The enforcement boundary is the trust taxonomy and replay policy: untrusted raw text is quarantined by default and never becomes model context or authority.”

**“Why not let the agent fix it automatically?”**

“Because a plausible diagnosis is not proof. Faultfix allows investigation, routes bounded containment to human review, and blocks permanent writes until the causal evidence and reproduction exist.”
