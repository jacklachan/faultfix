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
