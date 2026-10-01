import { describe, expect, it } from "vitest";

import { FakeJudgeProvider } from "./fake-judge";

const judge = new FakeJudgeProvider();

describe("FakeJudgeProvider", () => {
  it("separates observable facts from interpretations", async () => {
    const results = await judge.validateFacts([
      { clientFactId: "00000000-0000-4000-8000-000000000001", text: "相手から来週空いているか聞かれた" },
      { clientFactId: "00000000-0000-4000-8000-000000000002", text: "相手は絶対に自分のことが好き" },
    ]);

    expect(results.map((result) => result.status)).toEqual(["observable", "interpretation"]);
  });

  it("returns bounded, deterministic scores", async () => {
    const result = await judge.analyze([
      { clientFactId: "00000000-0000-4000-8000-000000000001", text: "相手から食事に誘われた" },
      { clientFactId: "00000000-0000-4000-8000-000000000002", text: "相手から来週空いているか聞かれた" },
      { clientFactId: "00000000-0000-4000-8000-000000000003", text: "二人で3時間話した" },
    ]);

    expect(result.scores.romanticInterest).toBeGreaterThan(48);
    expect(result.scores.evidenceSufficiency).toBe(60);
    expect(Object.values(result.scores).every((score) => score >= 0 && score <= 100)).toBe(true);
  });
});
