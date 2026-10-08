import { describe, expect, it } from "vitest";

import { JevTranslationAdapter, NoOpTranslator } from "./translator-jev";
import { FactTranslationError } from "./translator";
import type { FactInput } from "./types";

function factInput(text: string): FactInput {
  return { clientFactId: "00000000-0000-4000-8000-000000000000", text };
}

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

describe("NoOpTranslator", () => {
  it("mirrors the original text and marks the row as skipped", async () => {
    const translator = new NoOpTranslator();
    const result = await translator.translate(factInput("相手から食事に誘われた。"));
    expect(result.textOriginal).toBe("相手から食事に誘われた。");
    expect(result.textEnglish).toBe("相手から食事に誘われた。");
    expect(result.skipped).toBe(true);
    expect(translator.version).toMatch(/^signal-translator-/);
  });
});

describe("JevTranslationAdapter invariants", () => {
  it("preserves negation when the upstream returns a valid English sentence", async () => {
    const fetchMock: typeof fetch = async () => jsonResponse({
      textEnglish: "The other person did not invite me to dinner.",
    });
    const translator = new JevTranslationAdapter({ fetchImpl: fetchMock });

    const result = await translator.translate(factInput("相手から食事に誘われなかった。"));
    expect(result.textEnglish).toContain("not");
    expect(result.skipped).toBe(false);
  });

  it("rejects translations that drop the source negation", async () => {
    const fetchMock: typeof fetch = async () => jsonResponse({
      textEnglish: "I was invited to dinner.",
    });
    const translator = new JevTranslationAdapter({ fetchImpl: fetchMock });

    await expect(translator.translate(factInput("相手から食事に誘われなかった。")))
      .rejects.toBeInstanceOf(FactTranslationError);
  });

  it("rejects translations that introduce intent / affection the source lacks", async () => {
    const fetchMock: typeof fetch = async () => jsonResponse({
      textEnglish: "I think they are romantically interested in me.",
    });
    const translator = new JevTranslationAdapter({ fetchImpl: fetchMock });

    await expect(translator.translate(factInput("相手とカフェで30分話した。")))
      .rejects.toBeInstanceOf(FactTranslationError);
  });

  it("flags summarisation when the English text drops below 60% of the source length", async () => {
    const fetchMock: typeof fetch = async () => jsonResponse({
      textEnglish: "They talked.",
    });
    const translator = new JevTranslationAdapter({ fetchImpl: fetchMock });

    await expect(translator.translate(factInput("2026年10月1日、相手から来週の食事に誘われた。")))
      .rejects.toBeInstanceOf(FactTranslationError);
  });

  it("surfaces non-2xx responses as retryable errors", async () => {
    const fetchMock: typeof fetch = async () => jsonResponse({}, 503);
    const translator = new JevTranslationAdapter({ fetchImpl: fetchMock });

    await expect(translator.translate(factInput("相手と食事に行った。")))
      .rejects.toMatchObject({ retryable: true });
  });

  it("surfaces empty payloads as retryable errors", async () => {
    const fetchMock: typeof fetch = async () => jsonResponse({ textEnglish: "" });
    const translator = new JevTranslationAdapter({ fetchImpl: fetchMock });

    await expect(translator.translate(factInput("相手と食事に行った。")))
      .rejects.toMatchObject({ retryable: true });
  });

  it("rejects empty fact text without calling the upstream", async () => {
    let called = false;
    const fetchMock: typeof fetch = async () => {
      called = true;
      return jsonResponse({ textEnglish: "noop" });
    };
    const translator = new JevTranslationAdapter({ fetchImpl: fetchMock });

    await expect(translator.translate(factInput("   ")))
      .rejects.toBeInstanceOf(FactTranslationError);
    expect(called).toBe(false);
  });
});