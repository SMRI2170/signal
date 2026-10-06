import { describe, expect, it } from "vitest";

import { previewAnalysisRequestSchema, validateFactsRequestSchema } from "./types";

const facts = [{
  clientFactId: "11111111-1111-4111-8111-111111111111",
  text: "相手から来週の食事に誘われた。",
}];

describe("Jev request consent", () => {
  it("requires explicit consent before sending validation or analysis facts", () => {
    expect(validateFactsRequestSchema.safeParse({ facts }).success).toBe(false);
    expect(previewAnalysisRequestSchema.safeParse({ facts: [...facts, ...facts, ...facts] }).success).toBe(false);
  });

  it("accepts consented requests and rejects unexpected request fields", () => {
    expect(validateFactsRequestSchema.safeParse({ facts, jevConsent: true }).success).toBe(true);
    expect(previewAnalysisRequestSchema.safeParse({ facts: [...facts, ...facts, ...facts], jevConsent: true }).success).toBe(true);
    expect(validateFactsRequestSchema.safeParse({ facts, jevConsent: true, debug: true }).success).toBe(false);
    expect(validateFactsRequestSchema.safeParse({
      facts: [{ ...facts[0], debug: true }],
      jevConsent: true,
    }).success).toBe(false);
  });
});
