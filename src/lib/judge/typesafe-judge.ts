import { choice, score, TypeSafeClient } from "@typesafe-ai/sdk";

import { JudgeProviderUnavailableError, type JudgeProvider } from "./provider";
import type { AnalysisResult, FactInput, FactValidationResult } from "./types";

const SCORE_LEVELS = [
  "根拠がない、または明確に否定的な出来事だけがある。",
  "肯定的な根拠はほぼない。",
  "弱い根拠が少数ある。",
  "根拠はあるが、まだ限定的である。",
  "中立的な根拠が中心である。",
  "肯定的な根拠が中程度ある。",
  "肯定的な相手の行動が複数ある。",
  "明確な肯定的行動が繰り返しある。",
  "強い肯定的な行動が一貫している。",
  "非常に強く一貫した根拠がある。",
] as const;

const OBSERVABILITY_CRITERIA = {
  observable: "第三者が、発言・行動・回数・日時として確認できる記述。相手の感情や意図を推測していない。",
  interpretation: "相手の好意、気持ち、意図、性格を推測している記述。",
  unclear: "誰がいつ何をしたか不十分で、安定して判定できない記述。",
} as const;

function clampScore(value: number) {
  return Math.min(100, Math.max(0, Math.round(value)));
}

function normalizeScore(scoreValue: number) {
  return clampScore((scoreValue / (SCORE_LEVELS.length - 1)) * 100);
}

function validationCopy(status: keyof typeof OBSERVABILITY_CRITERIA) {
  switch (status) {
    case "observable":
      return {
        reasonJa: "観測可能な出来事として使用できます。",
        rewriteExampleJa: null,
      };
    case "interpretation":
      return {
        reasonJa: "相手の気持ちや意図についての解釈が含まれています。",
        rewriteExampleJa: "相手が実際に言ったこと、したこと、回数や日時を書いてみてください。",
      };
    case "unclear":
      return {
        reasonJa: "出来事の内容を判断するには情報が不足しています。",
        rewriteExampleJa: "誰が、いつ、何をしたかが分かる形で書いてみてください。",
      };
  }
}

type TypeSafeJudgeOptions = ConstructorParameters<typeof TypeSafeClient>[0];

export class TypeSafeJudgeProvider implements JudgeProvider {
  private readonly client: TypeSafeClient;

  constructor(options: TypeSafeJudgeOptions) {
    this.client = new TypeSafeClient({
      ...options,
      logLevel: "off",
      timeout: 8_000,
      retry: { maxRetries: 1 },
    });
  }

  async validateFacts(facts: FactInput[]): Promise<FactValidationResult[]> {
    const questions = Object.fromEntries(
      facts.map((fact, index) => [
        `fact_${index}`,
        choice(
          "この文章は、相手との間で実際に起きた出来事だけを記録していますか。文章そのものだけを判定し、書かれていない事情を推測しないでください。",
          OBSERVABILITY_CRITERIA,
        ),
      ]),
    );

    try {
      const response = await this.client.systemOne({
        state: { facts: facts.map(({ clientFactId, text }) => ({ clientFactId, text })) },
        questions,
      });

      return facts.map((fact, index) => {
        const status = response.answers[`fact_${index}`]?.choice;
        if (!status || !(status in OBSERVABILITY_CRITERIA)) {
          throw new JudgeProviderUnavailableError("TypeSafe returned an invalid fact validation result.");
        }

        const copy = validationCopy(status);
        return {
          clientFactId: fact.clientFactId,
          status,
          ...copy,
          // TypeSafe performs a typed judgment rather than translation. Preserve the
          // original Fact and leave an English field empty until translation is required.
          translatedFactEn: null,
        };
      });
    } catch (error) {
      if (error instanceof JudgeProviderUnavailableError) throw error;
      throw new JudgeProviderUnavailableError();
    }
  }

  async analyze(facts: FactInput[]): Promise<AnalysisResult> {
    try {
      const response = await this.client.systemOne({
        state: {
          facts: facts.map(({ clientFactId, text }) => ({ clientFactId, text })),
          instructions:
            "これは恋愛相談ではなく、観測された出来事だけを一定のRubricで評価する処理です。相手の感情を断定せず、入力以外を推測・補完しないでください。スコアは好意の確率ではなく、記録された行動から得られるSIGNALの強さです。",
        },
        questions: {
          romanticInterest: score(
            "恋愛的な関心を示す行動のSIGNALの強さを評価してください。感情の確率ではありません。",
            SCORE_LEVELS,
          ),
          desireToMeet: score(
            "会いたい意思を示す具体的な行動のSIGNALの強さを評価してください。",
            SCORE_LEVELS,
          ),
          initiative: score(
            "相手側から始めた具体的な連絡、提案、調整などの積極性を評価してください。",
            SCORE_LEVELS,
          ),
          evidenceSufficiency: score(
            "判断できる観測可能なFactの量・具体性・一貫性を評価してください。",
            SCORE_LEVELS,
          ),
        },
      });

      const answers = response.answers;
      const scoreValues = [
        answers.romanticInterest?.score,
        answers.desireToMeet?.score,
        answers.initiative?.score,
        answers.evidenceSufficiency?.score,
      ];

      if (scoreValues.some((value) => typeof value !== "number" || !Number.isFinite(value))) {
        throw new JudgeProviderUnavailableError("TypeSafe returned an invalid analysis result.");
      }

      return {
        scores: {
          romanticInterest: normalizeScore(answers.romanticInterest.score),
          desireToMeet: normalizeScore(answers.desireToMeet.score),
          initiative: normalizeScore(answers.initiative.score),
          evidenceSufficiency: normalizeScore(answers.evidenceSufficiency.score),
        },
        impact: null,
        modelVersion: response.model,
        rubricVersion: "signal-rubric-v1",
      };
    } catch (error) {
      if (error instanceof JudgeProviderUnavailableError) throw error;
      throw new JudgeProviderUnavailableError();
    }
  }
}

export function createTypeSafeJudgeProvider() {
  const apiKey = process.env.TYPESAFE_API_KEY ?? process.env.TYPESAFE_AI_API_KEY;
  if (!apiKey) return null;

  return new TypeSafeJudgeProvider({ apiKey });
}
