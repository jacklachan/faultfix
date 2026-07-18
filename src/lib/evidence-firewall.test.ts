import { describe, expect, it } from "vitest";
import {
  FIREWALL_DEMO_ARTIFACTS,
  FIREWALL_DEMO_CUTOFF,
  canSupportPermanentDecision,
  evidenceFirewallReceipt,
  screenEvidence,
} from "./evidence-firewall";

describe("evidence firewall", () => {
  it("quarantines instruction-like untrusted content without passing it to the model", () => {
    const screened = screenEvidence(FIREWALL_DEMO_ARTIFACTS[2], FIREWALL_DEMO_CUTOFF);
    expect(screened.disposition).toBe("quarantine");
    expect(screened.modelContext).toBeNull();
  });

  it("excludes evidence observed after the replay cutoff", () => {
    const screened = screenEvidence(FIREWALL_DEMO_ARTIFACTS[3], FIREWALL_DEMO_CUTOFF);
    expect(screened.disposition).toBe("future");
  });

  it("records a stable audit receipt and admits trusted observed facts", () => {
    const receipt = evidenceFirewallReceipt(FIREWALL_DEMO_ARTIFACTS, FIREWALL_DEMO_CUTOFF);
    expect(receipt.admitted).toEqual(["deploy-r42", "pool-saturation"]);
    expect(receipt.excluded).toEqual(["ticket-injection", "future-regression"]);
    expect(receipt.evidenceFingerprint).toMatch(/^[A-F0-9]{12}$/);
  });

  it("does not let a permanent decision rest on derived or quarantined content", () => {
    const screened = FIREWALL_DEMO_ARTIFACTS.slice(2).map((artifact) =>
      screenEvidence(artifact, FIREWALL_DEMO_CUTOFF),
    );
    expect(canSupportPermanentDecision(screened).allowed).toBe(false);
  });
});
