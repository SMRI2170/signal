import { choice, score, TypeSafeClient } from "@typesafe-ai/sdk";

import { JudgeProviderUnavailableError, type JudgeProvider } from "./provider";
import { parseJevUsage, type JevUsage } from "./jev-usage";
import { computeSignalLevel, evidenceSufficiencyTier } from "./signal-level";
import {
  analysisResultSchema,
  factValidationResultSchema,
  type AnalysisResult,
  type FactInput,
  type FactValidationResult,
} from "./types";
import { RUBRIC_VERSION, SCORE_SCHEMA_VERSION } from "./versions";

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

type TypeSafeClientOptions = ConstructorParameters<typeof TypeSafeClient>[0];
type UsageStage = "validation" | "analysis";
type UsageReporter = (event: JevUsage & { stage: UsageStage; operationId: string }) => void;
type TypeSafeJudgeOptions = TypeSafeClientOptions & {
  onUsage?: UsageReporter;
  operationId?: string;
};

const SCORE_KEYS = ["romanticInterest", "desireToMeet", "initiative", "evidenceSufficiency"] as const;

function assertExactKeys(value: unknown, expectedKeys: readonly string[]) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const actualKeys = Object.keys(value).sort();
  const sortedExpectedKeys = [...expectedKeys].sort();
  return actualKeys.length === sortedExpectedKeys.length &&
    actualKeys.every((key, index) => key === sortedExpectedKeys[index]);
}

function normalizeScore(value: number) {
  return Math.round((value / (SCORE_LEVELS.length - 1)) * 100);
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

export class JevJudgeProvider implements JudgeProvider {
  private readonly client: TypeSafeClient;
  private readonly onUsage: UsageReporter;
  private readonly operationId: string;

  constructor(options: TypeSafeJudgeOptions) {
    const { onUsage, operationId, ...clientOptions } = options;
    this.operationId = operationId ?? crypto.randomUUID();
    this.onUsage = onUsage ?? ((event) => {
      console.info("jev_usage", {
        operationId: event.operationId,
        stage: event.stage,
        modelVersion: event.modelVersion,
        inputTokens: event.inputTokens,
        outputTokens: event.outputTokens,
        estimatedCostUsd: event.estimatedCostUsd,
      });
    });
    this.client = new TypeSafeClient({
      ...clientOptions,
      defaultModel: clientOptions.defaultModel ?? process.env.TYPESAFE_DEFAULT_MODEL ?? "jev-latest",
      logLevel: "off",
      timeout: 8_000,
      retry: { maxRetries: 1 },
    });
  }

  private reportUsage(stage: UsageStage, model: unknown, usage: unknown) {
    const parsedUsage = parseJevUsage(model, usage);
    if (!parsedUsage) {
      throw new JudgeProviderUnavailableError("TypeSafe returned invalid usage metadata.");
    }
    this.onUsage({ ...parsedUsage, stage, operationId: this.operationId });
  }

  async validateFacts(facts: FactInput[]): Promise<FactValidationResult[]> {
    const questions = Object.fromEntries(
      facts.map((fact, index) => [
        `fact_${index}`,
        choice(
          `facts配列の${index}番目（clientFactId=${fact.clientFactId}）だけを判定してください。他のFactを根拠にせず、このFactは相手との間で実際に起きた出来事だけを記録していますか。文章に書かれていない事情は推測しないでください。`,
          OBSERVABILITY_CRITERIA,
        ),
      ]),
    );

    try {
      const response = await this.client.systemOne({
        state: { facts: facts.map(({ clientFactId, text }) => ({ clientFactId, text })) },
        questions,
      });
      this.reportUsage("validation", response.model, response.usage);

      const expectedAnswerKeys = facts.map((_fact, index) => `fact_${index}`);
      if (!assertExactKeys(response.answers, expectedAnswerKeys)) {
        throw new JudgeProviderUnavailableError("TypeSafe returned an invalid fact validation result.");
      }

      return facts.map((fact, index) => {
        const answer = response.answers[`fact_${index}`];
        const status = answer?.choice;
        if (
          answer?.type !== "choice" || typeof status !== "string" ||
          !Object.hasOwn(OBSERVABILITY_CRITERIA, status)
        ) {
          throw new JudgeProviderUnavailableError("TypeSafe returned an invalid fact validation result.");
        }

        return factValidationResultSchema.parse({
          clientFactId: fact.clientFactId,
          status,
          ...validationCopy(status as keyof typeof OBSERVABILITY_CRITERIA),
          // Translation happens at the route layer via FactTranslator.
          // The judge returns typed decisions only, so we surface the
          // translation status without duplicating the actual English text.
          translatedFactEn: null,
          translationSkipped: false,
        });
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
      this.reportUsage("analysis", response.model, response.usage);

      const answers = response.answers as unknown as Record<string, { type?: unknown; score?: unknown }>;
      if (!assertExactKeys(answers, SCORE_KEYS)) {
        throw new JudgeProviderUnavailableError("TypeSafe returned an invalid analysis result.");
      }

      const scoreValues = SCORE_KEYS.map((key) => answers[key]?.score);
      if (SCORE_KEYS.some((key) => answers[key]?.type !== "score") || scoreValues.some((value) =>
        typeof value !== "number" || !Number.isFinite(value) || value < 0 || value > SCORE_LEVELS.length - 1
      )) {
        throw new JudgeProviderUnavailableError("TypeSafe returned an invalid analysis result.");
      }

      const romanticInterest = normalizeScore(answers.romanticInterest.score as number);
      const desireToMeet = normalizeScore(answers.desireToMeet.score as number);
      const initiative = normalizeScore(answers.initiative.score as number);
      const evidenceSufficiency = normalizeScore(answers.evidenceSufficiency.score as number);
      const signalLevel = computeSignalLevel({ romanticInterest, desireToMeet, initiative });

      return analysisResultSchema.parse({
        scores: {
          signalLevel,
          romanticInterest,
          desireToMeet,
          initiative,
          evidenceSufficiency,
        },
        evidenceSufficiencyTier: evidenceSufficiencyTier(evidenceSufficiency),
        impact: null,
        modelVersion: response.model,
        rubricVersion: RUBRIC_VERSION,
        scoreSchemaVersion: SCORE_SCHEMA_VERSION,
      });
    } catch (error) {
      if (error instanceof JudgeProviderUnavailableError) throw error;
      throw new JudgeProviderUnavailableError();
    }
  }
}

export function createJevJudgeProvider() {
  const apiKey = process.env.TYPESAFE_API_KEY ?? process.env.TYPESAFE_AI_API_KEY;
  if (!apiKey) return null;

  return new JevJudgeProvider({ apiKey });
}
