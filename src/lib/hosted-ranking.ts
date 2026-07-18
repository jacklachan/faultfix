export type Hypothesis = { id: string; claim: string };

export type RankingResult = {
  source: "huggingface-space" | "deterministic";
  status: "ranked" | "unavailable";
  rankedIds: string[];
  detail: string;
};

export const HOSTED_RANKING_ENDPOINT = "https://jacklachan-faultfix.hf.space/gradio_api/call/rank_hypotheses";
export const HOSTED_RANKING_TIMEOUT_MS = 30_000;

type FetchLike = (input: string, init?: RequestInit) => Promise<{ ok: boolean; json: () => Promise<unknown>; text: () => Promise<string> }>;

type HostedRankingOptions = {
  fetcher?: FetchLike;
  signal?: AbortSignal;
  timeoutMs?: number;
};

function timeoutSignal(signal: AbortSignal | undefined, timeoutMs: number) {
  const controller = new AbortController();
  const abort = () => controller.abort();
  const timeout = setTimeout(abort, timeoutMs);
  if (signal?.aborted) abort();
  else signal?.addEventListener("abort", abort, { once: true });

  return {
    signal: controller.signal,
    dispose() {
      clearTimeout(timeout);
      signal?.removeEventListener("abort", abort);
    },
  };
}

function fallback(hypotheses: Hypothesis[], detail: string): RankingResult {
  return { source: "deterministic", status: "unavailable", rankedIds: hypotheses.map((hypothesis) => hypothesis.id), detail };
}

function validOrder(value: unknown, hypotheses: Hypothesis[]): value is string[] {
  const allowed = hypotheses.map((hypothesis) => hypothesis.id);
  return Array.isArray(value) && value.length === allowed.length && value.every((id) => typeof id === "string" && allowed.includes(id)) && new Set(value).size === value.length;
}

function completionPayload(stream: string): unknown | null {
  const events = stream.split("\n\n");
  const completed = events.find((event) => event.includes("event: complete"));
  const data = completed?.split("\n").find((line) => line.startsWith("data: "))?.slice(6);
  if (!data) return null;
  try { return JSON.parse(data); } catch { return null; }
}

/** Calls the public faultfix Space. Its model output remains advisory and never affects proofGate. */
export async function rankHypothesesWithHostedSpace(hypotheses: Hypothesis[], options: HostedRankingOptions = {}): Promise<RankingResult> {
  const fetcher = options.fetcher ?? fetch;
  const request = timeoutSignal(options.signal, options.timeoutMs ?? HOSTED_RANKING_TIMEOUT_MS);
  try {
    const queued = await fetcher(HOSTED_RANKING_ENDPOINT, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ data: [JSON.stringify(hypotheses)] }), signal: request.signal });
    if (!queued.ok) return fallback(hypotheses, "Hosted model is unavailable; deterministic order retained.");
    const eventId = (await queued.json() as { event_id?: unknown }).event_id;
    if (typeof eventId !== "string") return fallback(hypotheses, "Hosted model returned no event id; deterministic order retained.");
    const completed = await fetcher(`${HOSTED_RANKING_ENDPOINT}/${eventId}`, { signal: request.signal });
    if (!completed.ok) return fallback(hypotheses, "Hosted model did not complete; deterministic order retained.");
    const payload = completionPayload(await completed.text());
    const response = Array.isArray(payload) ? payload[0] as { rankedIds?: unknown } : null;
    return response && validOrder(response.rankedIds, hypotheses)
      ? { source: "huggingface-space", status: "ranked", rankedIds: response.rankedIds, detail: "Hosted model ranking is advisory only." }
      : fallback(hypotheses, "Hosted model returned no usable ranking; deterministic order retained.");
  } catch {
    return fallback(hypotheses, "Hosted model is unavailable; deterministic order retained.");
  } finally {
    request.dispose();
  }
}
