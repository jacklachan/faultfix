import { describe, expect, it } from "vitest";
import { rankHypothesesWithOllama, type Hypothesis } from "./local-ranking";

const hypotheses: Hypothesis[] = [{ id: "pool", claim: "The pool limit caused exhaustion." }, { id: "dns", claim: "DNS caused the outage." }];

describe("optional local hypothesis ranking", () => {
  it("uses a full unique Ollama ranking only as an advisory ranking", async () => {
    const result = await rankHypothesesWithOllama(hypotheses, { fetcher: async () => ({ ok: true, json: async () => ({ message: { content: '{"rankedIds":["dns","pool"]}' } }) }) });
    expect(result).toMatchObject({ source: "ollama", status: "ranked", rankedIds: ["dns", "pool"] });
  });
  it("retains deterministic input order when Ollama is offline", async () => {
    const result = await rankHypothesesWithOllama(hypotheses, { fetcher: async () => { throw new Error("offline"); } });
    expect(result).toMatchObject({ source: "deterministic", status: "unavailable", rankedIds: ["pool", "dns"] });
  });
  it("does not fetch when supplied an already-aborted signal", async () => {
    const controller = new AbortController();
    controller.abort();
    let fetchCalls = 0;
    const result = await rankHypothesesWithOllama(hypotheses, {
      signal: controller.signal,
      fetcher: async () => {
        fetchCalls += 1;
        throw new Error("should not fetch");
      },
    });
    expect(fetchCalls).toBe(0);
    expect(result).toMatchObject({ source: "deterministic", status: "unavailable", rankedIds: ["pool", "dns"] });
    expect(result.detail).toContain("cancelled");
  });
  it("rejects a partial local-model ranking", async () => {
    const result = await rankHypothesesWithOllama(hypotheses, { fetcher: async () => ({ ok: true, json: async () => ({ message: { content: '{"rankedIds":["pool"]}' } }) }) });
    expect(result).toMatchObject({ source: "deterministic", status: "invalid-response", rankedIds: ["pool", "dns"] });
  });
  it("rejects a duplicate local-model ranking", async () => {
    const result = await rankHypothesesWithOllama(hypotheses, { fetcher: async () => ({ ok: true, json: async () => ({ message: { content: '{"rankedIds":["pool","pool"]}' } }) }) });
    expect(result).toMatchObject({ source: "deterministic", status: "invalid-response", rankedIds: ["pool", "dns"] });
  });
  it("aborts a slow local request and retains deterministic order", async () => {
    let aborted = false;
    const result = await rankHypothesesWithOllama(hypotheses, {
      timeoutMs: 1,
      fetcher: async (_input, init) => new Promise((_resolve, reject) => {
        init?.signal?.addEventListener("abort", () => { aborted = true; reject(new Error("aborted")); });
      }),
    });
    expect(aborted).toBe(true);
    expect(result).toMatchObject({ source: "deterministic", status: "unavailable", rankedIds: ["pool", "dns"] });
    expect(result.detail).toContain("timed out");
  });
  it("times out while parsing a slow response body", async () => {
    let aborted = false;
    const result = await rankHypothesesWithOllama(hypotheses, {
      timeoutMs: 1,
      fetcher: async (_input, init) => ({
        ok: true,
        json: async () => new Promise((_resolve, reject) => {
          init?.signal?.addEventListener("abort", () => { aborted = true; reject(new Error("aborted")); });
        }),
      }),
    });
    expect(aborted).toBe(true);
    expect(result).toMatchObject({ source: "deterministic", status: "unavailable", rankedIds: ["pool", "dns"] });
    expect(result.detail).toContain("timed out");
  });
});
