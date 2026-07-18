export type Hypothesis = { id: string; claim: string };

export type RankingResult = {
  source: "ollama" | "deterministic";
  status: "ranked" | "unavailable" | "invalid-response";
  rankedIds: string[];
  detail: string;
};

type FetchLike = (input: string, init?: RequestInit) => Promise<{ ok: boolean; json: () => Promise<unknown> }>;

export const DEFAULT_OLLAMA_ENDPOINT = "http://127.0.0.1:11434/api/chat";
export const DEFAULT_OLLAMA_MODEL = "llama3.2";
export const DEFAULT_OLLAMA_TIMEOUT_MS = 5_000;

function fallback(hypotheses: Hypothesis[], status: RankingResult["status"], detail: string): RankingResult {
  return { source: "deterministic", status, rankedIds: hypotheses.map((hypothesis) => hypothesis.id), detail };
}

function parseRankedIds(payload: unknown, allowedIds: readonly string[]): string[] | null {
  if (!payload || typeof payload !== "object") return null;
  const content = (payload as { message?: { content?: unknown } }).message?.content;
  if (typeof content !== "string") return null;
  try {
    const parsed = JSON.parse(content) as { rankedIds?: unknown };
    if (!Array.isArray(parsed.rankedIds)) return null;
    const permitted = new Set(allowedIds);
    const ranked = parsed.rankedIds;
    if (
      permitted.size !== allowedIds.length ||
      ranked.length !== allowedIds.length ||
      ranked.some((id) => typeof id !== "string" || !permitted.has(id)) ||
      new Set(ranked).size !== ranked.length
    ) return null;
    return ranked;
  } catch {
    return null;
  }
}

/** Optional advisory ranking. It never changes faultfix's deterministic proof gate. */
export async function rankHypothesesWithOllama(hypotheses: Hypothesis[], options: { endpoint?: string; model?: string; fetcher?: FetchLike; timeoutMs?: number; signal?: AbortSignal } = {}): Promise<RankingResult> {
  if (options.signal?.aborted) return fallback(hypotheses, "unavailable", "Local Ollama request was cancelled; deterministic order retained.");
  const fetcher = options.fetcher ?? fetch;
  const controller = new AbortController();
  const timeoutMs = options.timeoutMs ?? DEFAULT_OLLAMA_TIMEOUT_MS;
  let timedOut = false;
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => {
      timedOut = true;
      controller.abort();
      reject(new Error("Ollama ranking timed out"));
    }, timeoutMs);
  });
  const cancel = () => controller.abort();
  options.signal?.addEventListener("abort", cancel, { once: true });
  try {
    const { response, payload } = await Promise.race([(async () => {
      const response = await fetcher(options.endpoint ?? DEFAULT_OLLAMA_ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: controller.signal,
        body: JSON.stringify({ model: options.model ?? DEFAULT_OLLAMA_MODEL, stream: false, format: "json", messages: [{ role: "user", content: `Rank these incident hypotheses by evidential plausibility. Return JSON only: {\"rankedIds\":[...]}. Hypotheses: ${JSON.stringify(hypotheses)}` }] }),
      });
      return { response, payload: response.ok ? await response.json() : null };
    })(), timeout]);
    if (!response.ok) return fallback(hypotheses, "unavailable", "Local Ollama did not accept the ranking request.");
    const rankedIds = parseRankedIds(payload, hypotheses.map((hypothesis) => hypothesis.id));
    return rankedIds ? { source: "ollama", status: "ranked", rankedIds, detail: "Local model ranking is advisory only." } : fallback(hypotheses, "invalid-response", "Local Ollama returned no usable ranking; deterministic order retained.");
  } catch {
    return fallback(hypotheses, "unavailable", timedOut ? "Local Ollama timed out; deterministic order retained." : "Local Ollama is unavailable; deterministic order retained.");
  } finally {
    if (timer) clearTimeout(timer);
    options.signal?.removeEventListener("abort", cancel);
    controller.abort();
  }
}
