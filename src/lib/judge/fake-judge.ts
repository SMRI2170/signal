import type { JudgeProvider } from "./provider";
import type { AnalysisResult, FactInput, FactValidationResult } from "./types";

const INTERPRETATION_PATTERNS = [
  /気がする/u,
  /好き(?:だ|そう|かも)?/u,
  /脈あり/u,
  /いい感じ/u,
  /興味がある/u,
  /絶対/u,
  /嫌われ/u,
  /冷たい/u,
];

const UNCLEAR_PATTERNS = [/^(?:なんかあった|いろいろあった|よくわからない)[。！？!?]?$/u];
const POSITIVE_PATTERNS = [/誘われ/u, /空いている/u, /会(?:い|う)/u, /連絡/u, /LINE/u, /メッセージ/u];
const STRONG_POSITIVE_PATTERNS = [/二人(?:で|きり)/u, /次(?:の|回)/u, /また会/u];
const NEGATIVE_PATTERNS = [/延期/u, /キャンセル/u, /返信がない/u, /既読無視/u, /断ら/u];

function clampScore(value: number) {
  return Math.min(100, Math.max(0, Math.round(value)));
}

function scoreFact(text: string): number {
  const strongPositive = STRONG_POSITIVE_PATTERNS.some((pattern) => pattern.test(text));
  const positive = POSITIVE_PATTERNS.some((pattern) => pattern.test(text));
  const negative = NEGATIVE_PATTERNS.some((pattern) => pattern.test(text));

  if (strongPositive) return 12;
  if (positive) return 7;
  if (negative) return -10;
  return 0;
}

export class FakeJudgeProvider implements JudgeProvider {
  async validateFacts(facts: FactInput[]): Promise<FactValidationResult[]> {
    return facts.map((fact) => {
      if (INTERPRETATION_PATTERNS.some((pattern) => pattern.test(fact.text))) {
        return {
          clientFactId: fact.clientFactId,
          status: "interpretation",
          reasonJa: "相手の気持ちや意図についての解釈が含まれています。",
          rewriteExampleJa: "相手が実際に言ったこと、したこと、回数や日時を書いてみてください。",
          translatedFactEn: null,
        };
      }

      if (UNCLEAR_PATTERNS.some((pattern) => pattern.test(fact.text))) {
        return {
          clientFactId: fact.clientFactId,
          status: "unclear",
          reasonJa: "出来事の内容を判断するには情報が不足しています。",
          rewriteExampleJa: "誰が、いつ、何をしたかが分かる形で書いてみてください。",
          translatedFactEn: null,
        };
      }

      return {
        clientFactId: fact.clientFactId,
        status: "observable",
        reasonJa: "観測可能な出来事として使用できます。",
        rewriteExampleJa: null,
        translatedFactEn: `[Fake translation] ${fact.text}`,
      };
    });
  }

  async analyze(facts: FactInput[]): Promise<AnalysisResult> {
    const factEffects = facts.map((fact) => scoreFact(fact.text));
    const totalEffect = factEffects.reduce((total, effect) => total + effect, 0);
    const meetingEvidence = facts.filter((fact) => /誘われ|空いている|会(?:い|う)|二人/u.test(fact.text)).length;
    const initiatedByOther = facts.filter((fact) => /相手から|相手が/u.test(fact.text)).length;

    return {
      scores: {
        romanticInterest: clampScore(48 + totalEffect),
        desireToMeet: clampScore(45 + meetingEvidence * 12 + totalEffect / 2),
        initiative: clampScore(42 + initiatedByOther * 10 + totalEffect / 3),
        evidenceSufficiency: clampScore(facts.length * 20),
      },
      impact: null,
      modelVersion: "fake-judge-v1",
      rubricVersion: "signal-rubric-v1",
    };
  }
}

export const fakeJudge = new FakeJudgeProvider();
