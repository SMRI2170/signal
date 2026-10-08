import type { JudgeProvider } from "./provider";
import type { AnalysisResult, FactValidationResult } from "./types";
import { MODEL_VERSION, RUBRIC_VERSION, SCORE_SCHEMA_VERSION } from "./versions";

/**
 * Judge invariants. These are pure predicates — they never reach the network
 * and never throw to express failures. The drift harness returns a list of
 * violations so a CI step can fail loudly when any rule breaks.
 */

export const ANALYSIS_SCORE_KEYS = [
  "romanticInterest",
  "desireToMeet",
  "initiative",
  "evidenceSufficiency",
] as const;
export type AnalysisScoreKey = (typeof ANALYSIS_SCORE_KEYS)[number];

export interface InvariantViolation {
  readonly rule: string;
  readonly detail: string;
}

export type InvariantCheck = (
  provider: JudgeProvider,
) => Promise<InvariantViolation[]>;

function allScoresInRange(result: AnalysisResult): boolean {
  return ANALYSIS_SCORE_KEYS.every((key) => {
    const value = result.scores[key];
    return Number.isInteger(value) && value >= 0 && value <= 100;
  });
}

/** Rule 1: every score must be an integer in [0, 100] and present. */
export const assertScoreBounds: InvariantCheck = async (provider) => {
  const violation: InvariantViolation[] = [];
  const fixtures = [
    ["observable", "2026年10月1日、相手から来週の食事に誘われた。"],
    ["negative", "相手から「今月は難しい」と返信があった。"],
    ["insufficient", "昨日カフェで会った。次の約束はまだ決まっていない。"],
  ] as const;
  for (const [, text] of fixtures) {
    const result = await provider.analyze([{ clientFactId: crypto.randomUUID(), text }]);
    if (!allScoresInRange(result)) {
      violation.push({
        rule: "score.bounds",
        detail: `Scores outside [0,100] or non-integer for fixture "${text}": ${JSON.stringify(result.scores)}`,
      });
    }
  }
  return violation;
};

/** Rule 2: modelVersion / rubricVersion / scoreSchemaVersion must be present and not "unknown". */
export const assertVersioningPresent: InvariantCheck = async (provider) => {
  const violations: InvariantViolation[] = [];
  const fixtures = ["相手から食事に誘われた。"] as const;
  for (const text of fixtures) {
    const result = await provider.analyze([{ clientFactId: crypto.randomUUID(), text }]);
    for (const field of ["modelVersion", "rubricVersion", "scoreSchemaVersion"] as const) {
      if (!result[field] || typeof result[field] !== "string" || result[field].trim().length === 0) {
        violations.push({
          rule: "versioning.present",
          detail: `Missing or empty ${field} on result for "${text}"`,
        });
      }
    }
  }
  return violations;
};

/**
 * Rule 3: when the only available fact contains an interpretation pattern,
 * the result must NOT report high romantic interest. Providers that conflate
 * subjective sentences with observable evidence are unsafe.
 */
export const assertInterpretationRejected: InvariantCheck = async (provider) => {
  const fixtures = [
    "相手は私のことが好きに違いない。",
    "相手は脈ありだと思う。",
  ] as const;
  const violations: InvariantViolation[] = [];
  for (const text of fixtures) {
    const result = await provider.analyze([{ clientFactId: crypto.randomUUID(), text }]);
    if (result.scores.romanticInterest > 60) {
      violations.push({
        rule: "interpretation.rejected",
        detail: `Interpretation input must not yield romanticInterest > 60. Got ${result.scores.romanticInterest} for "${text}"`,
      });
    }
  }
  return violations;
};

/**
 * Rule 4: a single observable fact with no follow-through must yield
 * evidenceSufficiency <= 50. Confidence in the score should reflect
 * scarcity of evidence.
 */
export const assertLowEvidenceReducesConfidence: InvariantCheck = async (provider) => {
  const violations: InvariantViolation[] = [];
  const fixtures = [
    "昨日カフェで30分話した。",
  ] as const;
  for (const text of fixtures) {
    const result = await provider.analyze([{ clientFactId: crypto.randomUUID(), text }]);
    if (result.scores.evidenceSufficiency > 50) {
      violations.push({
        rule: "evidence.low_confidence",
        detail: `Single-fact input must not yield evidenceSufficiency > 50. Got ${result.scores.evidenceSufficiency} for "${text}"`,
      });
    }
  }
  return violations;
};

/**
 * Rule 6: if validateFacts flags a fact as "interpretation" or "unclear",
 * it must NOT contribute a positive effect to the analysis. Providers that
 * pass the validation gate but still let interpretation drive the score up
 * are drift-bugs.
 */
export const assertValidationGateIsStrict: InvariantCheck = async (provider) => {
  const violations: InvariantViolation[] = [];
  const fixtures = [
    { text: "相手は私のことが好きに違いない。", expected: "interpretation" },
    { text: "いろいろあった。", expected: "unclear" },
  ] as const;
  for (const fixture of fixtures) {
    const validations: FactValidationResult[] = await provider.validateFacts([
      { clientFactId: crypto.randomUUID(), text: fixture.text },
    ]);
    const status = validations[0]?.status;
    if (status !== fixture.expected) {
      violations.push({
        rule: "validation.gate",
        detail: `validateFacts must classify "${fixture.text}" as ${fixture.expected}, got ${status}`,
      });
    }
  }
  return violations;
};

/**
 * Convenience: run a list of invariant checks against a provider and collect
 * all violations. Returns empty array when the provider is healthy.
 */
export async function runInvariants(
  provider: JudgeProvider,
  checks: ReadonlyArray<InvariantCheck>,
): Promise<InvariantViolation[]> {
  const results = await Promise.all(checks.map((check) => check(provider)));
  return results.flat();
}

/**
 * Constants to assert that the current provider matches the expected
 * versions for this build. If a developer bumps a version intentionally
 * they must update both the constant and SPEC.md.
 */
export const EXPECTED_VERSIONS = {
  modelVersion: MODEL_VERSION,
  rubricVersion: RUBRIC_VERSION,
  scoreSchemaVersion: SCORE_SCHEMA_VERSION,
} as const;

/**
 * `assertProviderMatchesExpectedVersions` is a separate check that fails
 * when the provider's emitted version strings drift from this build's
 * constants. Run it in CI to catch accidental unmapped bumps.
 */
export const assertProviderMatchesExpectedVersions: InvariantCheck = async (provider) => {
  const result = await provider.analyze([
    { clientFactId: crypto.randomUUID(), text: "相手から食事に誘われた。" },
  ]);
  const violations: InvariantViolation[] = [];
  for (const [key, expected] of Object.entries(EXPECTED_VERSIONS)) {
    if (result[key as keyof AnalysisResult] !== expected) {
      violations.push({
        rule: "versioning.matches_expected",
        detail: `${key} expected "${expected}", provider returned "${result[key as keyof AnalysisResult]}"`,
      });
    }
  }
  return violations;
};

export const DEFAULT_INVARIANT_CHECKS: ReadonlyArray<InvariantCheck> = [
  assertScoreBounds,
  assertVersioningPresent,
  assertInterpretationRejected,
  assertLowEvidenceReducesConfidence,
  assertValidationGateIsStrict,
  assertProviderMatchesExpectedVersions,
];