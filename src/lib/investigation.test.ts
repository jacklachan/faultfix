import { describe, expect, it } from "vitest";
import { actionResult, incidentReceipt, nextAction, proofGate } from "./investigation";

describe("Faultline proof engine", () => {
  it("does not unlock a fix from plausible but incomplete evidence", () => {
    expect(proofGate(["logs", "trace", "diff", "config"]).complete).toBe(false);
  });
  it("requires the causal chain and deterministic reproduction", () => {
    const result = proofGate(["logs", "trace", "diff", "config", "infra", "regression"]);
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
    expect(incidentReceipt(["logs", "trace", "diff", "config", "infra", "regression"])?.rootCause).toContain("r42");
  });
  it("advances the investigation through the bounded evidence sequence", () => {
    expect(nextAction([])?.id).toBe("logs");
    expect(nextAction(["logs", "trace"])?.id).toBe("diff");
    expect(nextAction(["logs", "trace", "diff", "config", "infra", "regression"])).toBeUndefined();
  });
});
