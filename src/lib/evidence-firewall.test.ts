import { describe, expect, it } from "vitest";
import {
  FIREWALL_DEMO_ARTIFACTS,
  FIREWALL_DEMO_CUTOFF,
  canSupportPermanentDecision,
  evidenceFirewallReceipt,
  evaluateContainmentLease,
  issueContainmentLease,
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

  it("invalidates an approved containment lease when the evidence pack changes", () => {
    const receipt = evidenceFirewallReceipt(FIREWALL_DEMO_ARTIFACTS, FIREWALL_DEMO_CUTOFF);
    const lease = issueContainmentLease(receipt.evidenceFingerprint);
    expect(
      evaluateContainmentLease(lease, {
        at: "2026-07-18T14:15:00Z",
        evidenceFingerprint: receipt.evidenceFingerprint,
        action: lease.action,
        resourceScope: lease.resourceScope,
      }).status,
    ).toBe("valid");
    expect(
      evaluateContainmentLease(lease, {
        at: "2026-07-18T14:15:00Z",
        evidenceFingerprint: "NEW-EVIDENCE-PACK",
        action: lease.action,
        resourceScope: lease.resourceScope,
      }).status,
    ).toBe("stale");
  });

  it("does not let a containment approval expand beyond its reviewed scope", () => {
    const lease = issueContainmentLease("PACK-123");
    expect(
      evaluateContainmentLease(lease, {
        at: "2026-07-18T14:15:00Z",
        evidenceFingerprint: "PACK-123",
        action: "restore pool limit globally",
        resourceScope: "all regions",
      }).status,
    ).toBe("scope-violation");
  });
});
