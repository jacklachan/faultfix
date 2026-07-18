import { describe, expect, it } from "vitest";
import {
  actionResult,
  incidentReceipt,
  nextAction,
  nextEvidencePolicy,
  POLICY_REPLAY,
  POLICY_REWARD,
  proofCertificate,
  proofGate,
  remediationPlan,
} from "./investigation";

describe("faultfix proof engine", () => {
  it("does not unlock a fix from plausible but incomplete evidence", () => {
    expect(proofGate(["logs", "trace", "diff", "config"]).complete).toBe(false);
  });
  it("requires the causal chain and deterministic reproduction", () => {
    const result = proofGate([
      "logs",
      "trace",
      "diff",
      "config",
      "infra",
      "regression",
    ]);
    expect(result.complete).toBe(true);
    expect(result.score).toBe(4);
  });
  it("records the infrastructure alternative as rejected", () => {
    expect(actionResult("infra").kind).toBe("ALTERNATIVE REJECTED");
  });
  it("records a failing-to-passing regression result", () => {
    expect(actionResult("regression").fact).toContain("reproduces");
  });
  it("only produces an Incident Receipt after the proof gate passes", () => {
    expect(incidentReceipt(["logs", "trace", "diff", "config"])).toBeNull();
    expect(
      incidentReceipt([
        "logs",
        "trace",
        "diff",
        "config",
        "infra",
        "regression",
      ])?.rootCause,
    ).toContain("r42");
  });
  it("advances the investigation through the bounded evidence sequence", () => {
    expect(nextAction([])?.id).toBe("logs");
    expect(nextAction(["logs", "trace"])?.id).toBe("diff");
    expect(
      nextAction(["logs", "trace", "diff", "config", "infra", "regression"]),
    ).toBeUndefined();
  });
  it("explains the uncertainty each next evidence action can reduce", () => {
    expect(nextEvidencePolicy([])?.action.id).toBe("logs");
    expect(
      nextEvidencePolicy(["logs", "trace", "diff", "config", "infra"])?.value,
    ).toBe("Decisive");
    expect(
      nextEvidencePolicy([
        "logs",
        "trace",
        "diff",
        "config",
        "infra",
        "regression",
      ]),
    ).toBeNull();
  });
  it("makes the policy tradeoff explicit: a quick guess cannot earn a safe change", () => {
    expect(POLICY_REPLAY.guessFirst.verdict).toBe("Unsafe");
    expect(POLICY_REPLAY.faultfix.links).toBe("5 / 5 causal links");
    expect(POLICY_REWARD).toContain("counterfactual");
  });
  it("keeps the causal certificate incomplete until every proof link is evidenced", () => {
    const certificate = proofCertificate(["logs", "trace", "diff", "config"]);
    expect(certificate.ready).toBe(false);
    expect(
      certificate.links.find((link) => link.id === "counterfactual")?.verified,
    ).toBe(false);
  });
  it("issues a replayable certificate only after the causal protocol is complete", () => {
    const completed = [
      "logs",
      "trace",
      "diff",
      "config",
      "infra",
      "regression",
    ] as const;
    const certificate = proofCertificate([...completed]);
    expect(certificate.ready).toBe(true);
    expect(certificate.links.every((link) => link.verified)).toBe(true);
    expect(certificate.counterfactual).toContain("LIMIT=20");
    expect(certificate.fingerprint).toMatch(/^FF-[A-F0-9]{8}$/);
    expect(
      certificate.boundaries.filter((boundary) => boundary.id === "falsifier"),
    ).toHaveLength(1);
    expect(proofCertificate([...completed]).fingerprint).toBe(
      certificate.fingerprint,
    );
  });
  it("only creates a bounded, reversible remediation packet after causal proof", () => {
    expect(remediationPlan(["logs", "trace", "diff", "config"])).toBeNull();
    const plan = remediationPlan([
      "logs",
      "trace",
      "diff",
      "config",
      "infra",
      "regression",
    ]);
    expect(plan?.reversible).toBe(true);
    expect(plan?.scope).toContain("5%");
    expect(plan?.halt).toHaveLength(3);
  });
});
