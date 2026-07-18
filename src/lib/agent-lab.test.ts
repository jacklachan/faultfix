import { describe, expect, it } from "vitest";
import { baselineAgentRun, evaluateAgentAuthority } from "./agent-lab";

describe("faultfix agent authority policy", () => {
  it("allows evidence gathering but blocks permanent changes before proof", () => {
    expect(evaluateAgentAuthority("observe", []).authority).toBe("allow");
    expect(
      evaluateAgentAuthority("permanent", ["logs", "trace"]).authority,
    ).toBe("block");
  });

  it("only lets an incident commander review containment after a release is evidenced", () => {
    expect(evaluateAgentAuthority("contain", ["logs"]).authority).toBe("block");
    expect(
      evaluateAgentAuthority("contain", ["logs", "trace", "diff"]).authority,
    ).toBe("review");
  });

  it("releases a proved permanent change to human review, never automatic execution", () => {
    expect(
      evaluateAgentAuthority("permanent", [
        "logs",
        "trace",
        "diff",
        "config",
        "infra",
        "regression",
      ]).authority,
    ).toBe("review");
  });

  it("keeps the baseline transparent about its blocked early proposal", () => {
    const run = baselineAgentRun();
    expect(run).toHaveLength(9);
    expect(run.find((event) => event.id === "permanent-too-early")?.authority).toBe(
      "block",
    );
  });
});
