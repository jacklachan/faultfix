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
});
