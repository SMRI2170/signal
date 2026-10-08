import type { FactInput } from "./types";

/**
 * The Golden Fact Set is a small, hand-curated set of synthetic facts whose
 * expected judge outcomes are pinned in this file. It exists so that:
 *
 *  1. Drift between Jev / FakeJudge / future providers is caught in CI before
 *     a model upgrade is shipped.
 *  2. The "judge asks for evidence" rule can be enforced without comparing to
 *     ground truth scores from a real human.
 *  3. JP vs EN inputs can be compared in the same fixture for #78.
 *
 * Rules for maintenance:
 *  - Every fixture MUST be synthetic. Never include real user data.
 *  - Every fixture MUST include both `textJa` and `textEn` so the translator
 *    pipeline can be benchmarked on the same content.
 *  - `expectedValidation` and `expectedScoreRange` are the contract.
 *    Bumping them is a deliberate decision and goes through SPEC.md.
 *  - Keep the set small (< 20). It runs on every CI build.
 */

export type ExpectedValidation = "observable" | "interpretation" | "unclear";

export type ScoreRange = readonly [number, number];

export interface GoldenFact {
  readonly id: string;
  readonly textJa: string;
  readonly textEn: string;
  readonly expectedValidation: ExpectedValidation;
  /** Tags let invariants target subsets of the fixture set. */
  readonly tags: ReadonlyArray<"interpretation" | "unclear" | "negation" | "specificity" | "pronoun" | "ambiguous-refer">;
}

export interface GoldenScenario {
  readonly id: string;
  readonly description: string;
  readonly factsJa: ReadonlyArray<string>;
  readonly factsEn: ReadonlyArray<string>;
  /** Expected range per score field. Order matches `ANALYSIS_SCORE_KEYS`. */
  readonly expectedRange: Readonly<Record<"romanticInterest" | "desireToMeet" | "initiative" | "evidenceSufficiency", ScoreRange>>;
  readonly tags: ReadonlyArray<"positive" | "negative" | "neutral" | "insufficient" | "ambiguous">;
}

export const GOLDEN_FACTS: ReadonlyArray<GoldenFact> = [
  {
    id: "gf.invitation.specific",
    textJa: "2026年10月1日、相手から来週の食事に誘われた。",
    textEn: "On October 1, 2026, the other person invited me to dinner next week.",
    expectedValidation: "observable",
    tags: ["specificity"],
  },
  {
    id: "gf.invitation.short",
    textJa: "相手から食事に誘われた。",
    textEn: "The other person invited me to dinner.",
    expectedValidation: "observable",
    tags: [],
  },
  {
    id: "gf.interpretation.affection",
    textJa: "相手は私のことが好きに違いない。",
    textEn: "The other person must be in love with me.",
    expectedValidation: "interpretation",
    tags: ["interpretation"],
  },
  {
    id: "gf.interpretation.interest",
    textJa: "相手は脈ありだと思う。",
    textEn: "I think there is a positive signal from the other person.",
    expectedValidation: "interpretation",
    tags: ["interpretation"],
  },
  {
    id: "gf.unclear.vague",
    textJa: "昨日、少し色々な話をした。",
    textEn: "Yesterday we talked about various things.",
    expectedValidation: "unclear",
    tags: ["unclear"],
  },
  {
    id: "gf.negation.refusal",
    textJa: "相手から食事に誘ったが「今月は難しい」と断られた。",
    textEn: "I asked the other person to dinner but they declined, saying this month is difficult.",
    expectedValidation: "observable",
    tags: ["negation"],
  },
  {
    id: "gf.pronoun.swap_self",
    textJa: "私が相手に食事に誘われた。",
    textEn: "I was invited to dinner by the other person.",
    expectedValidation: "observable",
    tags: ["pronoun"],
  },
  {
    id: "gf.ambiguous.refer_no_subject",
    textJa: "食事に誘われた。",
    textEn: "Someone invited me to dinner.",
    expectedValidation: "unclear",
    tags: ["ambiguous-refer"],
  },
];

export const GOLDEN_SCENARIOS: ReadonlyArray<GoldenScenario> = [
  {
    id: "gs.positive.first-meeting",
    description: "Clear positive trajectory with specific actions and dates.",
    factsJa: [
      "2026年10月1日、相手から来週の夕食に誘われた。",
      "相手から来週の空いている日を聞かれた。",
      "帰宅後に相手からお礼のメッセージが届いた。",
    ],
    factsEn: [
      "On October 1, 2026, the other person invited me to dinner next week.",
      "The other person asked me which days I was free next week.",
      "After I got home, the other person sent me a thank-you message.",
    ],
    expectedRange: {
      romanticInterest: [60, 85],
      desireToMeet: [70, 95],
      initiative: [70, 95],
      evidenceSufficiency: [55, 80],
    },
    tags: ["positive"],
  },
  {
    id: "gs.negative.cancellation",
    description: "Repeated non-action or postponement from the other side.",
    factsJa: [
      "こちらが誘った食事を相手が延期した。",
      "相手は新しい日程を提案しなかった。",
      "予定の確認に「今月は難しい」と返信があった。",
    ],
    factsEn: [
      "The other person postponed a meal I had proposed.",
      "The other person did not propose an alternative date.",
      "They replied, 'This month is difficult', when I asked to confirm the plan.",
    ],
    expectedRange: {
      romanticInterest: [30, 50],
      desireToMeet: [30, 50],
      initiative: [40, 60],
      evidenceSufficiency: [50, 80],
    },
    tags: ["negative"],
  },
  {
    id: "gs.insufficient.single.facts",
    description: "Single observable fact with no follow-through yet.",
    factsJa: [
      "10月1日に相手とカフェで30分話した。",
      "会話後に追加の連絡はない。",
      "次の約束はまだ決まっていない。",
    ],
    factsEn: [
      "On October 1, I talked with the other person at a cafe for 30 minutes.",
      "There has been no further contact since the conversation.",
      "No plan has been set for the next meeting yet.",
    ],
    expectedRange: {
      romanticInterest: [50, 75],
      desireToMeet: [40, 65],
      initiative: [35, 60],
      evidenceSufficiency: [50, 75],
    },
    tags: ["insufficient"],
  },
  {
    id: "gs.ambiguous.mixed-signal",
    description: "Two contradicting observables — should not collapse into a confident SIGNAL.",
    factsJa: [
      "相手からランチに誘われた。",
      "翌週の予定を聞くと「また今度」と言われた。",
    ],
    factsEn: [
      "The other person invited me to lunch.",
      "When I asked about next week, they said, 'maybe another time'.",
    ],
    expectedRange: {
      romanticInterest: [40, 70],
      desireToMeet: [40, 70],
      initiative: [30, 60],
      evidenceSufficiency: [35, 60],
    },
    tags: ["ambiguous"],
  },
];

/**
 * Two near-identical scenarios that swap "私" / "相手" only. Used to assert
 * that the judge is symmetric across referents and free of positional bias.
 */
export const PRONOUN_INVARIANCE_PAIRS: ReadonlyArray<{
  readonly id: string;
  readonly factsSelfJa: string[];
  readonly factsOtherJa: string[];
}> = [
  {
    id: "pi.invitation",
    factsSelfJa: [
      "相手から食事に誘われた。",
      "相手から週末に会う約束を取り付けた。",
      "相手から次の食事の提案があった。",
    ],
    factsOtherJa: [
      "私が食事に誘った。",
      "私が週末に会う約束を取り付けた。",
      "私が次の食事の提案をした。",
    ],
  },
];

/** Helper to build FactInput[] from a list of texts. */
export function factInputsFromTexts(texts: ReadonlyArray<string>): FactInput[] {
  return texts.map((text) => ({
    clientFactId: crypto.randomUUID(),
    text,
  }));
}