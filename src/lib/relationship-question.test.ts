import { describe, expect, it } from "vitest";

import {
  answerRelationshipQuestion,
  relationshipQuestionRequestSchema,
  type RelationshipQuestionFact,
  type RelationshipQuestionSnapshot,
} from "./relationship-question";

const firstScanAt = "2026-10-01T10:00:00.000Z";
const secondScanAt = "2026-10-03T10:00:00.000Z";

const facts: RelationshipQuestionFact[] = [
  { id: "10000000-0000-4000-8000-000000000001", text_original: "相手から次の週末に会えるか聞かれた。", created_at: "2026-10-01T09:00:00.000Z" },
  { id: "10000000-0000-4000-8000-000000000002", text_original: "相手が土曜日の昼に行く店を提案した。", created_at: "2026-10-02T09:00:00.000Z" },
  { id: "10000000-0000-4000-8000-000000000003", text_original: "会ったあと、相手からお礼のメッセージが届いた。", created_at: "2026-10-04T09:00:00.000Z" },
];

const snapshots: RelationshipQuestionSnapshot[] = [
  {
    id: "20000000-0000-4000-8000-000000000001",
    previous_snapshot_id: null,
    romantic_interest: 52,
    desire_to_meet: 42,
    initiative: 47,
    evidence_sufficiency: 35,
    created_at: firstScanAt,
  },
  {
    id: "20000000-0000-4000-8000-000000000002",
    previous_snapshot_id: "20000000-0000-4000-8000-000000000001",
    romantic_interest: 64,
    desire_to_meet: 55,
    initiative: 63,
    evidence_sufficiency: 49,
    created_at: secondScanAt,
  },
];

describe("relationship question answers", () => {
  it("answers change questions with the selected relationship's new facts and linked snapshot scores", () => {
    const answer = answerRelationshipQuestion("change", facts, snapshots);

    expect(answer.trend).toEqual({
      previousScore: 52,
      currentScore: 64,
      delta: 12,
      previousAt: firstScanAt,
      currentAt: secondScanAt,
    });
    expect(answer.facts.map((fact) => fact.id)).toEqual([facts[1].id]);
    expect(answer.summary).toContain("+12");
    expect(answer.context).toContain("個々のFact");
  });

  it("does not claim a trend before a second analysis exists", () => {
    const answer = answerRelationshipQuestion("change", facts, snapshots.slice(0, 1));

    expect(answer.trend).toBeNull();
    expect(answer.summary).toContain("最初のSIGNAL");
    expect(answer.facts).toHaveLength(1);
  });

  it("suggests what to observe from the lowest structured metric", () => {
    const answer = answerRelationshipQuestion("next", facts, snapshots);

    expect(answer.weakestMetric).toEqual({ label: "判断材料", score: 49 });
    expect(answer.context).toContain("誰が・いつ・何をしたか");
  });

  it("states what remains unknown without inferring a person's feelings", () => {
    const answer = answerRelationshipQuestion("unknowns", facts, snapshots);

    expect(answer.summary).toContain("相手の気持ちそのもの");
    expect(answer.facts).toHaveLength(2);
  });

  it("provides an add-fact path when no analysis history exists", () => {
    const answer = answerRelationshipQuestion("evidence", facts, []);

    expect(answer.summary).toContain("まだ分析履歴");
    expect(answer.suggestFact).toBe(true);
    expect(answer.facts).toHaveLength(3);
  });

  it("accepts only a known, typed question topic", () => {
    expect(relationshipQuestionRequestSchema.safeParse({ topic: "next" }).success).toBe(true);
    expect(relationshipQuestionRequestSchema.safeParse({ topic: "write anything" }).success).toBe(false);
    expect(relationshipQuestionRequestSchema.safeParse({ topic: "next", relationshipId: "other" }).success).toBe(false);
  });
});
