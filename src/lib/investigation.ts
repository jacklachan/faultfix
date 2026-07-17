export type ActionId = "logs" | "trace" | "diff" | "config" | "infra" | "regression";

export const ACTIONS: { id: ActionId; label: string }[] = [
  { id: "logs", label: "Search logs" }, { id: "trace", label: "Inspect trace" },
  { id: "diff", label: "Compare deploy diff" }, { id: "config", label: "Inspect configuration" },
  { id: "infra", label: "Review infrastructure events" }, { id: "regression", label: "Run regression test" },
];
const records: Record<ActionId, { id: ActionId; kind: string; fact: string; source: string }> = {
  logs: { id: "logs", kind: "SYMPTOM", fact: "Connection acquisition exhausted only in AZ-A.", source: "payments-api logs" },
  trace: { id: "trace", kind: "TRACE", fact: "Auth and payment paths stall at the data-service pool.", source: "trace 7fa1" },
  diff: { id: "diff", kind: "DEPLOY", fact: "r42 includes the connection-pool configuration change.", source: "commit 61b9" },
  config: { id: "config", kind: "CONFIG", fact: "DATABASE_POOL_LIMIT was reduced from 40 to 20.", source: "service config" },
  infra: { id: "infra", kind: "ALTERNATIVE REJECTED", fact: "DNS event occurred elsewhere; no AZ-A routing change was found.", source: "infrastructure record" },
  regression: { id: "regression", kind: "REPRODUCTION", fact: "Pool limit 20 reproduces the AZ-A timeout; 40 resolves it.", source: "deterministic test" },
};
export const initialInvestigation = { completed: [] as ActionId[] };
export function actionResult(id: ActionId) { return records[id]; }
export function proofGate(completed: ActionId[]) {
  const has = (ids: ActionId[]) => ids.every((id) => completed.includes(id));
  const requirements = [
    { label: "Direct symptom evidence", met: has(["logs", "trace"]) },
    { label: "Deploy / config evidence", met: has(["diff", "config"]) },
    { label: "Complete causal chain", met: has(["logs", "trace", "diff", "config", "infra"]) },
    { label: "Reproduction test", met: has(["regression"]) },
  ];
  const score = requirements.filter((item) => item.met).length;
  return { requirements, score, complete: score === requirements.length };
}

export function incidentReceipt(completed: ActionId[]) {
  if (!proofGate(completed).complete) return null;
  return {
    id: "FL-INC-042-R42",
    confidence: "High - deterministic reproduction",
    rootCause: "Deploy r42 halved DATABASE_POOL_LIMIT from 40 to 20, exhausting data-service connections in AZ-A and timing out auth and payment requests.",
    rejected: "DNS event: rejected. It affected another zone and no AZ-A routing change was recorded.",
    test: "connection-pool.regression: fails at pool limit 20 and passes at 40.",
    patch: "Restore DATABASE_POOL_LIMIT=40 and retain the regression test.",
  };
}
