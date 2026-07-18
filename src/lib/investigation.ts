export type ActionId =
  "logs" | "trace" | "diff" | "config" | "infra" | "regression";

export const ACTIONS: { id: ActionId; label: string }[] = [
  { id: "logs", label: "Search logs" },
  { id: "trace", label: "Inspect trace" },
  { id: "diff", label: "Compare deploy diff" },
  { id: "config", label: "Inspect configuration" },
  { id: "infra", label: "Review infrastructure events" },
  { id: "regression", label: "Run regression test" },
];
const records: Record<
  ActionId,
  { id: ActionId; kind: string; fact: string; source: string }
> = {
  logs: {
    id: "logs",
    kind: "SYMPTOM",
    fact: "Connection acquisition exhausted only in AZ-A.",
    source: "payments-api logs",
  },
  trace: {
    id: "trace",
    kind: "TRACE",
    fact: "Auth and payment paths stall at the data-service pool.",
    source: "trace 7fa1",
  },
  diff: {
    id: "diff",
    kind: "DEPLOY",
    fact: "r42 includes the connection-pool configuration change.",
    source: "commit 61b9",
  },
  config: {
    id: "config",
    kind: "CONFIG",
    fact: "DATABASE_POOL_LIMIT was reduced from 40 to 20.",
    source: "service config",
  },
  infra: {
    id: "infra",
    kind: "ALTERNATIVE REJECTED",
    fact: "DNS event occurred elsewhere; no AZ-A routing change was found.",
    source: "infrastructure record",
  },
  regression: {
    id: "regression",
    kind: "REPRODUCTION",
    fact: "Pool limit 20 reproduces the AZ-A timeout; 40 resolves it.",
    source: "deterministic test",
  },
};
export const initialInvestigation = { completed: [] as ActionId[] };
export function actionResult(id: ActionId) {
  return records[id];
}
export function nextAction(completed: ActionId[]) {
  return ACTIONS.find((action) => !completed.includes(action.id));
}

const actionPolicy: Record<
  ActionId,
  { value: "High" | "Decisive"; rationale: string; changesMind: string }
> = {
  logs: {
    value: "High",
    rationale: "Establishes the failure scope before investigating a cause.",
    changesMind:
      "If connection exhaustion is absent in AZ-A, the pool-limit lead loses priority.",
  },
  trace: {
    value: "High",
    rationale:
      "Tests whether the data-service pool is on the failing customer path.",
    changesMind:
      "If auth and payments do not traverse the pool, the proposed mechanism fails.",
  },
  diff: {
    value: "High",
    rationale:
      "Tests whether the suspected change occurred before the failure.",
    changesMind: "If r42 did not touch the service, temporal causality fails.",
  },
  config: {
    value: "High",
    rationale: "Tests the exact mechanism, not merely a correlated deploy.",
    changesMind:
      "If the pool limit was unchanged, r42 is not a sufficient explanation.",
  },
  infra: {
    value: "High",
    rationale: "Attempts to disprove the most plausible competing explanation.",
    changesMind: "If DNS changed AZ-A routing, the alternative remains live.",
  },
  regression: {
    value: "Decisive",
    rationale:
      "Performs the smallest counterfactual test that can unlock a safe recommendation.",
    changesMind:
      "If pool 40 does not recover requests, the candidate patch is rejected.",
  },
};

export function nextEvidencePolicy(completed: ActionId[]) {
  const action = nextAction(completed);
  return action ? { action, ...actionPolicy[action.id] } : null;
}

export const POLICY_REPLAY = {
  guessFirst: {
    name: "Guess-first agent",
    subtitle: "Optimizes for a quick answer",
    steps: [
      "Sees the overlapping DNS event.",
      "Treats timing as causation.",
      "Proposes a DNS cache flush without a reproduction.",
    ],
    result: "Unsupported change proposed",
    links: "0 / 5 causal links",
    verdict: "Unsafe",
  },
  faultfix: {
    name: "Faultfix policy",
    subtitle: "Optimizes for a falsifiable answer",
    steps: [
      "Bounds the AZ-A symptom and affected request path.",
      "Tests the r42 → pool-limit mechanism.",
      "Eliminates DNS, then runs a counterfactual regression.",
    ],
    result: "Smallest reversible change packet",
    links: "5 / 5 causal links",
    verdict: "Scoped",
  },
} as const;

export const POLICY_REWARD =
  "evidence gain + alternative elimination + counterfactual proof − unsupported action";
export function proofGate(completed: ActionId[]) {
  const has = (ids: ActionId[]) => ids.every((id) => completed.includes(id));
  const requirements = [
    { label: "Direct symptom evidence", met: has(["logs", "trace"]) },
    { label: "Deploy / config evidence", met: has(["diff", "config"]) },
    {
      label: "Complete causal chain",
      met: has(["logs", "trace", "diff", "config", "infra"]),
    },
    { label: "Reproduction test", met: has(["regression"]) },
  ];
  const score = requirements.filter((item) => item.met).length;
  return { requirements, score, complete: score === requirements.length };
}

export type CertificateLink = {
  id:
    "temporal" | "mechanism" | "propagation" | "alternative" | "counterfactual";
  label: string;
  statement: string;
  evidence: ActionId[];
  verified: boolean;
};

export type CertificateBoundary = {
  id: "scope" | "assumption" | "falsifier";
  label: string;
  statement: string;
};

function scenarioFingerprint(value: string) {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return `FF-${(hash >>> 0).toString(16).toUpperCase().padStart(8, "0")}`;
}

/** A transparent proof protocol for this simulated incident, not a claim about live production causality. */
export function proofCertificate(completed: ActionId[]) {
  const has = (evidence: ActionId[]) =>
    evidence.every((id) => completed.includes(id));
  const links: CertificateLink[] = [
    {
      id: "temporal",
      label: "Temporal order",
      statement: "r42's configuration change preceded the AZ-A failures.",
      evidence: ["diff", "logs"],
      verified: has(["diff", "logs"]),
    },
    {
      id: "mechanism",
      label: "Specific mechanism",
      statement:
        "Reducing the pool from 40 to 20 exhausts data-service connections.",
      evidence: ["config", "logs"],
      verified: has(["config", "logs"]),
    },
    {
      id: "propagation",
      label: "Impact propagation",
      statement: "The exhausted pool stalls auth and payment request paths.",
      evidence: ["trace"],
      verified: has(["trace"]),
    },
    {
      id: "alternative",
      label: "Alternative eliminated",
      statement:
        "The DNS event was elsewhere and cannot explain the AZ-A pool exhaustion.",
      evidence: ["infra"],
      verified: has(["infra"]),
    },
    {
      id: "counterfactual",
      label: "Counterfactual reproduction",
      statement: "At pool 20 the timeout reproduces; at 40 it resolves.",
      evidence: ["regression"],
      verified: has(["regression"]),
    },
  ];
  const ready = proofGate(completed).complete;
  const fingerprint = scenarioFingerprint(
    links.map((link) => `${link.id}:${link.statement}`).join("|"),
  );
  return {
    id: "FF-INC-042-R42",
    ready,
    links,
    fingerprint,
    verdict: ready ? "Causal proof complete" : "Causal proof incomplete",
    counterfactual:
      "DATABASE_POOL_LIMIT=20 → AZ-A timeout; DATABASE_POOL_LIMIT=40 → requests complete within 300ms.",
    boundaries: [
      {
        id: "scope",
        label: "Decision scope",
        statement:
          "This conclusion applies to INC-042, the r42 deployment, and the recorded AZ-A failure pattern.",
      },
      {
        id: "assumption",
        label: "Required assumption",
        statement:
          "No unrecorded AZ-A routing or configuration change occurred in the same window.",
      },
      {
        id: "assumption",
        label: "Required assumption",
        statement:
          "The regression environment preserves the connection-pool behavior relevant to this outage.",
      },
      {
        id: "falsifier",
        label: "Would overturn the case",
        statement:
          "A pool limit of 40 still reproduces the same failure, or a distinct AZ-A routing change is found.",
      },
    ] satisfies CertificateBoundary[],
  };
}

export type RemediationPlan = {
  id: string;
  ready: boolean;
  change: string;
  reversible: boolean;
  scope: string;
  owner: string;
  expiry: string;
  preconditions: string[];
  verify: string[];
  halt: string[];
  rollback: string;
};

export type ContainmentPlan = {
  id: string;
  available: boolean;
  change: string;
  whyNow: string;
  scope: string;
  expiry: string;
  approval: string;
  preserve: string[];
  verify: string[];
  stop: string[];
  rollback: string;
};

/**
 * A containment proposal is deliberately weaker than a remediation plan.
 * It limits customer impact while preserving evidence; it does not assert a cause.
 */
export function containmentPlan(completed: ActionId[]): ContainmentPlan | null {
  if (!completed.includes("diff")) return null;
  return {
    id: "FF-CONTAIN-042-A",
    available: true,
    change: "Pause r42 promotion and drain AZ-A traffic from r42 instances.",
    whyNow:
      "A recent release is confirmed, but the mechanism and competing explanation are still unproven.",
    scope:
      "AZ-A payments-api instances running r42 only. Do not modify other zones or configuration values.",
    expiry: "Expires after 15 minutes unless the incident commander renews it.",
    approval: "Requires an incident commander to approve the reversible containment step.",
    preserve: [
      "Snapshot r42 config, routing state, and the current evidence timeline before traffic is drained.",
      "Keep the affected r42 instances available for the regression reproduction.",
    ],
    verify: [
      "Checkout error rate falls in the drained AZ-A slice.",
      "No new zone receives a correlated timeout pattern.",
    ],
    stop: [
      "Traffic drain increases total checkout error rate.",
      "The containment cannot be reversed within the stated window.",
    ],
    rollback:
      "Restore the previous AZ-A traffic allocation, retain the evidence snapshot, and continue investigation.",
  };
}

/** A simulated, reviewable change packet. It never performs a production action. */
export function remediationPlan(completed: ActionId[]): RemediationPlan | null {
  if (!proofGate(completed).complete) return null;
  return {
    id: "FF-CHANGE-042-A",
    ready: true,
    change: "Restore DATABASE_POOL_LIMIT from 20 to 40.",
    reversible: true,
    scope:
      "5% of AZ-A payments-api traffic for 10 minutes, then staged promotion.",
    owner: "Payments on-call",
    expiry: "Valid only for incident INC-042 and the recorded r42 state.",
    preconditions: [
      "Causal certificate FF-INC-042-R42 is complete.",
      "No data-corruption signal is present.",
      "Previous configuration value (40) is available for rollback.",
    ],
    verify: [
      "AZ-A checkout p95 remains below 300ms for 10 minutes.",
      "Connection acquisition failures return to baseline.",
      "The regression test passes at pool limit 40.",
    ],
    halt: [
      "Checkout error rate rises above the pre-change baseline.",
      "Connection saturation exceeds 85% during the canary.",
      "Any new zone shows correlated failures.",
    ],
    rollback:
      "Set DATABASE_POOL_LIMIT back to 20 and preserve the incident record for review.",
  };
}

export type PreventionGuardrail = {
  id: string;
  sourceReceipt: string;
  invariant: string;
  appliesTo: string;
  verify: string;
  exception: string;
};

export function preventionGuardrail(
  completed: ActionId[],
): PreventionGuardrail | null {
  if (!proofGate(completed).complete) return null;
  return {
    id: "FF-GUARD-042-POOL",
    sourceReceipt: "FF-INC-042-R42",
    invariant:
      "DATABASE_POOL_LIMIT must remain at or above 40 for payments-api.",
    appliesTo: "Production configuration changes to payments-api.",
    verify:
      "Run connection-pool.regression and require the AZ-A request path to complete within 300ms.",
    exception:
      "A lower limit requires a new causal certificate, an updated regression threshold, and an approved staged canary.",
  };
}

export function evaluatePoolLimitGuardrail(poolLimit: number) {
  const allowed = Number.isFinite(poolLimit) && poolLimit >= 40;
  return {
    allowed,
    title: allowed ? "Eligible for staged canary" : "Blocked before deployment",
    detail: allowed
      ? `r43 preserves DATABASE_POOL_LIMIT=${poolLimit}. The change still requires the canary checks in the safe change packet.`
      : `r43 sets DATABASE_POOL_LIMIT=${poolLimit}. This recreates the recorded failure mechanism from INC-042, so Faultfix blocks the deploy.`,
  };
}

export function incidentReceipt(completed: ActionId[]) {
  if (!proofGate(completed).complete) return null;
  return {
    id: "FF-INC-042-R42",
    confidence: "High - deterministic reproduction",
    rootCause:
      "Deploy r42 halved DATABASE_POOL_LIMIT from 40 to 20, exhausting data-service connections in AZ-A and timing out auth and payment requests.",
    rejected:
      "DNS event: rejected. It affected another zone and no AZ-A routing change was recorded.",
    test: "connection-pool.regression: fails at pool limit 20 and passes at 40.",
    patch: "Restore DATABASE_POOL_LIMIT=40 and retain the regression test.",
  };
}
