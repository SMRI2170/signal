import { describe, expect, it } from "vitest";

import { fakeJudge } from "./fake-judge";
import {
  assertInterpretationRejected,
  assertLowEvidenceReducesConfidence,
  assertProviderMatchesExpectedVersions,
  assertScoreBounds,
  assertValidationGateIsStrict,
  assertVersioningPresent,
  DEFAULT_INVARIANT_CHECKS,
  runInvariants,
} from "./invariants";
import {
  factInputsFromTexts,
  GOLDEN_FACTS,
  GOLDEN_SCENARIOS,
} from "./golden-fact-set";
import {
  MODEL_VERSION,
  RUBRIC_VERSION,
  SCORE_SCHEMA_VERSION,
} from "./versions";

// Reference the version constants so eslint no-unused-vars stays quiet and so a
// version bump cannot accidentally drop the import without breaking this file.
const REFERENCED_VERSIONS = [MODEL_VERSION, RUBRIC_VERSION, SCORE_SCHEMA_VERSION];
void REFERENCED_VERSIONS;

describe("judge invariants on FakeJudgeProvider", () => {
  it("score.bounds holds", async () => {
    const violations = await assertScoreBounds(fakeJudge);
    expect(violations).toEqual([]);
  });

  it("versioning fields are present and non-empty", async () => {
    const violations = await assertVersioningPresent(fakeJudge);
    expect(violations).toEqual([]);
  });

  it("interpretation patterns must not yield high romantic interest", async () => {
    const violations = await assertInterpretationRejected(fakeJudge);
    expect(violations).toEqual([]);
  });

  it("low-fact inputs must not yield evidence sufficiency > 50", async () => {
    const violations = await assertLowEvidenceReducesConfidence(fakeJudge);
    expect(violations).toEqual([]);
  });

  it("validateFacts gates interpretation and unclear texts", async () => {
    const violations = await assertValidationGateIsStrict(fakeJudge);
    expect(violations).toEqual([]);
  });

  it("provider matches expected model/rubric/score schema versions", async () => {
    const violations = await assertProviderMatchesExpectedVersions(fakeJudge);
    expect(violations).toEqual([]);
  });

  it("default invariant bundle reports no violations", async () => {
    const violations = await runInvariants(fakeJudge, DEFAULT_INVARIANT_CHECKS);
    expect(violations).toEqual([]);
  });
});

describe("Golden Fact Set — synthetic data integrity", () => {
  it("every Golden Fact carries textJa and textEn", () => {
    for (const fact of GOLDEN_FACTS) {
      expect(fact.textJa).toMatch(/[ぁ-んァ-ヶ一-龯]/);
      expect(fact.textEn).toMatch(/[A-Za-z]/);
      expect(fact.expectedValidation).toBeOneOf(["observable", "interpretation", "unclear"]);
    }
  });

  it("every Golden Scenario falls within its expected score ranges on FakeJudge", async () => {
    for (const scenario of GOLDEN_SCENARIOS) {
      const result = await fakeJudge.analyze(factInputsFromTexts(scenario.factsJa));
      for (const [key, [min, max]] of Object.entries(scenario.expectedRange)) {
        const actual = result.scores[key as keyof typeof result.scores];
        expect(actual, `${scenario.id}.${key}`).toBeGreaterThanOrEqual(min);
        expect(actual, `${scenario.id}.${key}`).toBeLessThanOrEqual(max);
      }
    }
  });

  it("version constants are non-empty strings", () => {
    expect(MODEL_VERSION).toMatch(/^signal-/);
    expect(RUBRIC_VERSION).toMatch(/^signal-/);
    expect(SCORE_SCHEMA_VERSION).toMatch(/^signal-/);
  });
});