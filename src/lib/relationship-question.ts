import { z } from "zod";

export const relationshipQuestionTopicSchema = z.enum(["change", "evidence", "unknowns", "next"]);
export type RelationshipQuestionTopic = z.infer<typeof relationshipQuestionTopicSchema>;

export const relationshipQuestionRequestSchema = z.object({
  topic: relationshipQuestionTopicSchema,
}).strict();

const factReferenceSchema = z.object({
  id: z.uuid(),
  text: z.string().min(1).max(300),
  createdAt: z.iso.datetime({ offset: true }),
}).strict();

const trendSchema = z.object({
  previousScore: z.number().int().min(0).max(100),
  currentScore: z.number().int().min(0).max(100),
  delta: z.number().int().min(-100).max(100),
  previousAt: z.iso.datetime({ offset: true }),
  currentAt: z.iso.datetime({ offset: true }),
}).strict();

const metricSchema = z.object({
  label: z.string().min(1),
  score: z.number().int().min(0).max(100),
}).strict();

export const relationshipQuestionAnswerSchema = z.object({
  topic: relationshipQuestionTopicSchema,
  summary: z.string().min(1).max(300),
  context: z.string().min(1).max(500),
  evidenceTitle: z.string().min(1).max(100),
  facts: z.array(factReferenceSchema).max(10),
  trend: trendSchema.nullable(),
  weakestMetric: metricSchema.nullable(),
  suggestFact: z.boolean(),
}).strict();
export type RelationshipQuestionAnswer = z.infer<typeof relationshipQuestionAnswerSchema>;

export type RelationshipQuestionFact = {
  id: string;
  text_original: string;
  created_at: string;
};

export type RelationshipQuestionSnapshot = {
  id: string;
  previous_snapshot_id: string | null;
  romantic_interest: number;
  desire_to_meet: number;
  initiative: number;
  evidence_sufficiency: number;
  created_at: string;
};

const METRICS = [
  {
    key: "romantic_interest",
    label: "恋愛的な関心のSIGNAL",
    nextObservation: "一度だけでなく、相手からの肯定的な行動が続くかを記録してみてください。",
  },
  {
    key: "desire_to_meet",
    label: "会いたいサイン",
    nextObservation: "次の予定を誰が提案し、具体的に決めるかを記録してみてください。",
  },
  {
    key: "initiative",
    label: "相手からの積極性",
    nextObservation: "連絡や予定の提案を、どちらが始めるかを記録してみてください。",
  },
  {
    key: "evidence_sufficiency",
    label: "判断材料",
    nextObservation: "誰が・いつ・何をしたかが分かる、具体的な出来事を記録してみてください。",
  },
] as const;

function dateValue(value: string) {
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function descendingFacts(facts: RelationshipQuestionFact[]) {
  return [...facts].sort((a, b) => dateValue(b.created_at) - dateValue(a.created_at));
}

function factReferences(facts: RelationshipQuestionFact[], limit = 5) {
  return descendingFacts(facts).slice(0, limit).map((fact) => ({
    id: fact.id,
    text: fact.text_original,
    createdAt: fact.created_at,
  }));
}

function emptyAnswer(topic: RelationshipQuestionTopic, facts: RelationshipQuestionFact[]): RelationshipQuestionAnswer {
  return relationshipQuestionAnswerSchema.parse({
    topic,
    summary: "まだ分析履歴がありません。",
    context: facts.length > 0
      ? "Factは保存されています。新しいFactを追加すると、SIGNALの分析履歴が作られます。"
      : "まず出来事をFactとして追加すると、この関係について一緒に整理できます。",
    evidenceTitle: "保存済みFact",
    facts: factReferences(facts),
    trend: null,
    weakestMetric: null,
    suggestFact: true,
  });
}

export function answerRelationshipQuestion(
  topic: RelationshipQuestionTopic,
  inputFacts: RelationshipQuestionFact[],
  inputSnapshots: RelationshipQuestionSnapshot[],
): RelationshipQuestionAnswer {
  const snapshots = [...inputSnapshots].sort((a, b) => dateValue(a.created_at) - dateValue(b.created_at));
  const current = snapshots.at(-1);
  if (!current) return emptyAnswer(topic, inputFacts);

  const currentTimestamp = dateValue(current.created_at);
  const factsAtCurrentScan = inputFacts.filter((fact) => dateValue(fact.created_at) <= currentTimestamp);
  const previous = current.previous_snapshot_id
    ? snapshots.find((snapshot) => snapshot.id === current.previous_snapshot_id)
    : snapshots.at(-2);
  const factsSincePrevious = previous
    ? factsAtCurrentScan.filter((fact) => dateValue(fact.created_at) > dateValue(previous.created_at))
    : factsAtCurrentScan;
  const trend = previous
    ? {
        previousScore: previous.romantic_interest,
        currentScore: current.romantic_interest,
        delta: current.romantic_interest - previous.romantic_interest,
        previousAt: previous.created_at,
        currentAt: current.created_at,
      }
    : null;

  if (topic === "change") {
    if (!trend) {
      return relationshipQuestionAnswerSchema.parse({
        topic,
        summary: `最初のSIGNALは${current.romantic_interest}/100です。`,
        context: "比較できる前回の分析はまだありません。次の分析から変化を見られます。今回の分析に含まれるFactを表示しています。",
        evidenceTitle: "今回の分析に含まれるFact",
        facts: factReferences(factsAtCurrentScan),
        trend: null,
        weakestMetric: null,
        suggestFact: true,
      });
    }

    const movement = trend.delta === 0
      ? "変わっていません"
      : `${trend.delta > 0 ? "+" : "−"}${Math.abs(trend.delta)}変化しました`;
    return relationshipQuestionAnswerSchema.parse({
      topic,
      summary: `SIGNALは${trend.previousScore}から${trend.currentScore}へ${movement}。`,
      context: `前回の分析後に追加されたFactは${factsSincePrevious.length}件です。これらは今回の分析に含まれていますが、個々のFactがスコアをどれだけ動かしたかは判定していません。`,
      evidenceTitle: "前回の分析後に追加されたFact",
      facts: factReferences(factsSincePrevious),
      trend,
      weakestMetric: null,
      suggestFact: true,
    });
  }

  if (topic === "evidence") {
    const count = factsAtCurrentScan.length;
    return relationshipQuestionAnswerSchema.parse({
      topic,
      summary: `現在の分析には、保存済みFact ${count}件が含まれています。`,
      context: "表示するFactは分析に使った記録の一部です。個別のFactがスコアを直接決めたとは限りません。",
      evidenceTitle: "分析に含まれた最近のFact",
      facts: factReferences(factsAtCurrentScan),
      trend: null,
      weakestMetric: null,
      suggestFact: count < 3,
    });
  }

  if (topic === "unknowns") {
    return relationshipQuestionAnswerSchema.parse({
      topic,
      summary: "記録から確認できるのは、実際に起きた発言や行動です。相手の気持ちそのものは、この記録だけでは分かりません。",
      context: `判断材料のスコアは${current.evidence_sufficiency}/100です。気持ちを決めつけず、次に起きた具体的な行動を記録してください。`,
      evidenceTitle: "最近記録されたFact",
      facts: factReferences(factsAtCurrentScan, 3),
      trend: null,
      weakestMetric: null,
      suggestFact: current.evidence_sufficiency < 50,
    });
  }

  const weakestMetric = [...METRICS]
    .map((metric) => ({ label: metric.label, score: current[metric.key], nextObservation: metric.nextObservation }))
    .sort((a, b) => a.score - b.score)[0];
  return relationshipQuestionAnswerSchema.parse({
    topic,
    summary: `いま最も低い指標は「${weakestMetric.label}」の${weakestMetric.score}/100です。`,
    context: weakestMetric.nextObservation,
    evidenceTitle: "最近記録されたFact",
    facts: factReferences(factsAtCurrentScan, 3),
    trend: null,
    weakestMetric: { label: weakestMetric.label, score: weakestMetric.score },
    suggestFact: true,
  });
}
