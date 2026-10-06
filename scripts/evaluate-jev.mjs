import { choice, score, TypeSafeClient } from "@typesafe-ai/sdk";

const apiKey = process.env.TYPESAFE_API_KEY;
if (!apiKey) {
  console.error("TYPESAFE_API_KEY is required. Add it to a server-only environment before running this synthetic evaluation.");
  process.exit(1);
}

const scoreLevels = [
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
];

const validationCriteria = {
  observable: "第三者が、発言・行動・回数・日時として確認できる記述。相手の感情や意図を推測していない。",
  interpretation: "相手の好意、気持ち、意図、性格を推測している記述。",
  unclear: "誰がいつ何をしたか不十分で、安定して判定できない記述。",
};

const validationFacts = [
  { id: "observable", text: "2026年10月1日、相手から来週の食事に誘われた。" },
  { id: "interpretation", text: "相手は私のことが好きに違いない。" },
  { id: "unclear", text: "昨日、少し色々な話をした。" },
];

const scenarios = [
  {
    name: "positive",
    facts: [
      "相手から来週の夕食に誘われた。",
      "相手から来週の空いている日を聞かれた。",
      "帰宅後に相手からお礼のメッセージが届いた。",
    ],
  },
  {
    name: "negative",
    facts: [
      "こちらが誘った食事を相手が延期した。",
      "相手は新しい日程を提案しなかった。",
      "予定の確認に「今月は難しい」と返信があった。",
    ],
  },
  {
    name: "insufficient_evidence",
    facts: [
      "10月1日に相手とカフェで会った。",
      "その後の連絡や次の約束はまだない。",
      "二人の会話の内容は記録していない。",
    ],
  },
];

const client = new TypeSafeClient({
  apiKey,
  defaultModel: process.env.TYPESAFE_DEFAULT_MODEL ?? "jev-latest",
  logLevel: "off",
  timeout: 8_000,
  retry: { maxRetries: 1 },
});

function usageSummary(model, usage) {
  if (
    typeof model !== "string" || model.trim().length === 0 ||
    !Number.isSafeInteger(usage?.input_tokens) || usage.input_tokens < 0 ||
    !Number.isSafeInteger(usage?.output_tokens) || usage.output_tokens < 0
  ) throw new Error("Jev returned invalid usage metadata.");

  return {
    modelVersion: model,
    inputTokens: usage.input_tokens,
    outputTokens: usage.output_tokens,
    estimatedCostUsd: Number((usage.input_tokens * 0.042 / 1_000_000).toFixed(12)),
  };
}

const validationResponse = await client.systemOne({
  state: { facts: validationFacts.map(({ id, text }) => ({ id, text })) },
  questions: Object.fromEntries(
    validationFacts.map(({ id }) => [
      id,
      choice(
        `validationFactsの${id}だけを判定してください。他のFactを根拠にせず、相手との間で実際に起きた出来事だけを記録していますか。文章に書かれていない事情は推測しないでください。`,
        validationCriteria,
      ),
    ]),
  ),
});

const validStatuses = new Set(Object.keys(validationCriteria));
const validations = Object.fromEntries(validationFacts.map(({ id }) => {
  const answer = validationResponse.answers[id];
  if (answer?.type !== "choice" || !validStatuses.has(answer.choice)) {
    throw new Error(`Jev returned an invalid validation result for ${id}.`);
  }
  return [id, { choice: answer.choice, confidence: answer.confidence, probabilities: answer.probabilities }];
}));

const usage = [usageSummary(validationResponse.model, validationResponse.usage)];
const analyses = [];
for (const scenario of scenarios) {
  const response = await client.systemOne({
    state: {
      facts: scenario.facts,
      instructions:
        "恋愛相談ではなく、観測された出来事だけを評価してください。相手の感情を断定せず、入力以外を推測・補完しないでください。スコアは好意の確率ではなく、記録された行動から得られるSIGNALの強さです。",
    },
    questions: {
      romanticInterest: score("恋愛的な関心を示す行動のSIGNALの強さを評価してください。感情の確率ではありません。", scoreLevels),
      desireToMeet: score("会いたい意思を示す具体的な行動のSIGNALの強さを評価してください。", scoreLevels),
      initiative: score("相手側から始めた具体的な連絡、提案、調整などの積極性を評価してください。", scoreLevels),
      evidenceSufficiency: score("判断できる観測可能なFactの量・具体性・一貫性を評価してください。", scoreLevels),
    },
  });

  const answers = response.answers;
  const answerKeys = ["romanticInterest", "desireToMeet", "initiative", "evidenceSufficiency"];
  if (
    Object.keys(answers).length !== answerKeys.length ||
    answerKeys.some((key) => answers[key]?.type !== "score" || !Number.isFinite(answers[key].score) || answers[key].score < 0 || answers[key].score > 9)
  ) throw new Error(`Jev returned an invalid analysis result for ${scenario.name}.`);

  analyses.push({
    scenario: scenario.name,
    scores: Object.fromEntries(answerKeys.map((key) => [key, Math.round((answers[key].score / 9) * 100)])),
  });
  usage.push(usageSummary(response.model, response.usage));
}

const totalEstimatedCostUsd = Number(usage.reduce((sum, call) => sum + call.estimatedCostUsd, 0).toFixed(12));
console.log(JSON.stringify({
  reviewRequired: true,
  validations,
  analyses,
  usage,
  totalEstimatedCostUsd,
}, null, 2));
