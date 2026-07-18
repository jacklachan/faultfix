import { describe, expect, it } from "vitest";
import { HOSTED_RANKING_ENDPOINT, rankHypothesesWithHostedSpace } from "./hosted-ranking";

const hypotheses = [{ id: "pool-limit", claim: "pool" }, { id: "dns-event", claim: "dns" }];

describe("hosted ranking adapter", () => {
  it("uses a completed Gradio event as advisory output", async () => {
    const fetcher = async (url: string) => url === HOSTED_RANKING_ENDPOINT
      ? { ok: true, json: async () => ({ event_id: "event-1" }), text: async () => "" }
      : { ok: true, json: async () => ({}), text: async () => "event: complete\ndata: [{\"rankedIds\":[\"pool-limit\",\"dns-event\"]}]\n\n" };
    await expect(rankHypothesesWithHostedSpace(hypotheses, { fetcher })).resolves.toMatchObject({ source: "huggingface-space", status: "ranked" });
  });
  it("retains deterministic ordering when the Space is unavailable", async () => {
    const result = await rankHypothesesWithHostedSpace(hypotheses, { fetcher: async () => ({ ok: false, json: async () => ({}), text: async () => "" }) });
    expect(result).toMatchObject({ source: "deterministic", rankedIds: ["pool-limit", "dns-event"] });
  });

  it("times out a stalled Space request and retains deterministic ordering", async () => {
    let receivedSignal: AbortSignal | undefined;
    const fetcher = (_url: string, init?: RequestInit) =>
      new Promise<{ ok: boolean; json: () => Promise<unknown>; text: () => Promise<string> }>((_resolve, reject) => {
        receivedSignal = init?.signal ?? undefined;
        if (init?.signal?.aborted) {
          reject(new Error("aborted"));
          return;
        }
        init?.signal?.addEventListener("abort", () => reject(new Error("aborted")), { once: true });
      });

    const result = await rankHypothesesWithHostedSpace(hypotheses, {
      fetcher,
      timeoutMs: 1,
    });

    expect(receivedSignal).toBeDefined();
    expect(receivedSignal?.aborted).toBe(true);
    expect(result).toMatchObject({ source: "deterministic", status: "unavailable" });
  });
});
