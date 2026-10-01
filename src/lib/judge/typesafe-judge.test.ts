import { describe, expect, it } from "vitest";

import { JudgeProviderUnavailableError } from "./provider";
import { TypeSafeJudgeProvider } from "./typesafe-judge";
import type { FactInput } from "./types";

const facts: FactInput[] = [
  {
    clientFactId: "11111111-1111-1111-1111-111111111111",
    text: "相手から来週の食事の予定を聞かれた。",
  },
  {
    clientFactId: "22222222-2222-2222-2222-222222222222",
    text: "相手は私のことが好きな気がする。",
  },
];

function response(body: unknown) {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { "content-type": "application/json" },
  });
}

describe("TypeSafeJudgeProvider", () => {
  it("maps typed fact choices to SIGNAL validation results", async () => {
    const provider = new TypeSafeJudgeProvider({
      apiKey: "test-key",
      fetch: async () =>
        response({
          model: "jev-test",
          answers: {
            fact_0: {
              type: "choice",
              choice: "observable",
              confidence: 0.9,
              probabilities: { observable: 0.9, interpretation: 0.05, unclear: 0.05 },
            },
            fact_1: {
              type: "choice",
              choice: "interpretation",
              confidence: 0.95,
              probabilities: { observable: 0.02, interpretation: 0.95, unclear: 0.03 },
            },
          },
          usage: { input_tokens: 20, output_tokens: 4 },
        }),
    });

    const result = await provider.validateFacts(facts);

    expect(result).toMatchObject([
      { clientFactId: facts[0].clientFactId, status: "observable", translatedFactEn: null },
      { clientFactId: facts[1].clientFactId, status: "interpretation" },
    ]);
    expect(result[1].rewriteExampleJa).toBeTruthy();
  });

  it("normalizes TypeSafe score levels to SIGNAL's 0-100 scale", async () => {
    const provider = new TypeSafeJudgeProvider({
      apiKey: "test-key",
      fetch: async () =>
        response({
          model: "jev-test",
          answers: {
            romanticInterest: { type: "score", score: 6.3, confidence: 0.8, legend: {}, probabilities: {} },
            desireToMeet: { type: "score", score: 7.2, confidence: 0.8, legend: {}, probabilities: {} },
            initiative: { type: "score", score: 4.5, confidence: 0.8, legend: {}, probabilities: {} },
            evidenceSufficiency: { type: "score", score: 8.1, confidence: 0.8, legend: {}, probabilities: {} },
          },
          usage: { input_tokens: 20, output_tokens: 4 },
        }),
    });

    const result = await provider.analyze(facts);

    expect(result).toMatchObject({
      scores: {
        romanticInterest: 70,
        desireToMeet: 80,
        initiative: 50,
        evidenceSufficiency: 90,
      },
      modelVersion: "jev-test",
    });
  });

  it("maps provider failures without exposing the Fact payload", async () => {
    const provider = new TypeSafeJudgeProvider({
      apiKey: "test-key",
      fetch: async () => new Response("temporary failure", { status: 503 }),
    });

    await expect(provider.validateFacts(facts)).rejects.toBeInstanceOf(JudgeProviderUnavailableError);
  });
});
