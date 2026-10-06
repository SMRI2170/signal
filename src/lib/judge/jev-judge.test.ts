import { describe, expect, it } from "vitest";

import { JudgeProviderUnavailableError } from "./provider";
import { JevJudgeProvider } from "./jev-judge";
import type { FactInput } from "./types";

const facts: FactInput[] = [
  {
    clientFactId: "11111111-1111-4111-8111-111111111111",
    text: "相手から来週の食事の予定を聞かれた。",
  },
  {
    clientFactId: "22222222-2222-4222-8222-222222222222",
    text: "相手は私のことが好きな気がする。",
  },
];

function response(body: unknown) {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { "content-type": "application/json" },
  });
}

describe("JevJudgeProvider", () => {
  it("maps typed fact choices to SIGNAL validation results", async () => {
    const usageEvents: Array<Record<string, unknown>> = [];
    const capturedQuestions: Array<Record<string, { instructions?: unknown }>> = [];
    const provider = new JevJudgeProvider({
      apiKey: "test-key",
      operationId: "operation-test",
      onUsage: (event) => usageEvents.push(event),
      fetch: async (_input, init) => {
        capturedQuestions.push((JSON.parse(String(init?.body)) as { questions: Record<string, { instructions?: unknown }> }).questions);
        return response({
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
        });
      },
    });

    const result = await provider.validateFacts(facts);

    expect(result).toMatchObject([
      { clientFactId: facts[0].clientFactId, status: "observable", translatedFactEn: null },
      { clientFactId: facts[1].clientFactId, status: "interpretation" },
    ]);
    expect(result[1].rewriteExampleJa).toBeTruthy();
    expect(capturedQuestions[0]?.fact_0?.instructions).toContain(facts[0].clientFactId);
    expect(capturedQuestions[0]?.fact_1?.instructions).toContain(facts[1].clientFactId);
    expect(capturedQuestions[0]?.fact_0?.instructions).toContain("他のFactを根拠にせず");
    expect(usageEvents).toEqual([{
      provider: "jev",
      modelVersion: "jev-test",
      inputTokens: 20,
      outputTokens: 4,
      estimatedCostUsd: 0.00000084,
      stage: "validation",
      operationId: "operation-test",
    }]);
    expect(JSON.stringify(usageEvents)).not.toContain(facts[0].text);
  });

  it("normalizes TypeSafe score levels to SIGNAL's 0-100 scale", async () => {
    const provider = new JevJudgeProvider({
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
    const provider = new JevJudgeProvider({
      apiKey: "test-key",
      fetch: async () => new Response("temporary failure", { status: 503 }),
    });

    const error = await provider.validateFacts(facts).catch((caught: unknown) => caught);
    expect(error).toBeInstanceOf(JudgeProviderUnavailableError);
    expect((error as Error).message).not.toContain(facts[0].text);
  });

  it("rejects out-of-range scores instead of clamping and persisting them", async () => {
    const provider = new JevJudgeProvider({
      apiKey: "test-key",
      onUsage: () => undefined,
      fetch: async () =>
        response({
          model: "jev-test",
          answers: {
            romanticInterest: { type: "score", score: 10, confidence: 0.8, legend: {}, probabilities: {} },
            desireToMeet: { type: "score", score: 7, confidence: 0.8, legend: {}, probabilities: {} },
            initiative: { type: "score", score: 4, confidence: 0.8, legend: {}, probabilities: {} },
            evidenceSufficiency: { type: "score", score: 8, confidence: 0.8, legend: {}, probabilities: {} },
          },
          usage: { input_tokens: 20, output_tokens: 4 },
        }),
    });

    await expect(provider.analyze(facts)).rejects.toBeInstanceOf(JudgeProviderUnavailableError);
  });

  it("rejects unexpected answer keys and malformed usage metadata", async () => {
    const extraAnswerProvider = new JevJudgeProvider({
      apiKey: "test-key",
      onUsage: () => undefined,
      fetch: async () =>
        response({
          model: "jev-test",
          answers: {
            fact_0: { type: "choice", choice: "observable", confidence: 0.9, probabilities: {} },
            fact_1: { type: "choice", choice: "interpretation", confidence: 0.9, probabilities: {} },
            unexpected: { type: "choice", choice: "observable", confidence: 1, probabilities: {} },
          },
          usage: { input_tokens: 20, output_tokens: 4 },
        }),
    });
    const malformedUsageProvider = new JevJudgeProvider({
      apiKey: "test-key",
      onUsage: () => undefined,
      fetch: async () =>
        response({
          model: "jev-test",
          answers: {
            fact_0: { type: "choice", choice: "observable", confidence: 0.9, probabilities: {} },
            fact_1: { type: "choice", choice: "interpretation", confidence: 0.9, probabilities: {} },
          },
          usage: { input_tokens: -1, output_tokens: 4 },
        }),
    });

    await expect(extraAnswerProvider.validateFacts(facts)).rejects.toBeInstanceOf(JudgeProviderUnavailableError);
    await expect(malformedUsageProvider.validateFacts(facts)).rejects.toBeInstanceOf(JudgeProviderUnavailableError);
  });
});
