import { NextResponse } from "next/server";
import { z } from "zod";

import { apiError } from "@/lib/api-error";
import {
  answerRelationshipQuestion,
  relationshipQuestionRequestSchema,
  type RelationshipQuestionFact,
  type RelationshipQuestionSnapshot,
} from "@/lib/relationship-question";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: Request, { params }: { params: Promise<{ relationshipId: string }> }) {
  const { relationshipId } = await params;
  if (!z.uuid().safeParse(relationshipId).success) return apiError("NOT_FOUND", "対象の記録が見つかりません。", 404);
  const body = await request.json().catch(() => null);
  const parsed = relationshipQuestionRequestSchema.safeParse(body);
  if (!parsed.success) return apiError("INVALID_REQUEST", "質問を選び直してください。", 400);

  const supabase = await createClient();
  const { data: claims } = await supabase.auth.getClaims();
  if (!claims?.claims?.sub) return apiError("AUTH_REQUIRED", "ログイン後に質問してください。", 401);

  const { data: relationship, error: relationshipError } = await supabase
    .from("relationships")
    .select("id")
    .eq("id", relationshipId)
    .maybeSingle();
  if (relationshipError) return apiError("QUESTION_UNAVAILABLE", "記録を読み込めませんでした。", 503);
  if (!relationship) return apiError("NOT_FOUND", "対象の記録が見つかりません。", 404);

  const [factsResult, snapshotsResult] = await Promise.all([
    supabase
      .from("facts")
      .select("id, text_original, created_at")
      .eq("relationship_id", relationshipId)
      .order("created_at", { ascending: true }),
    supabase
      .from("analysis_snapshots")
      .select("id, previous_snapshot_id, romantic_interest, desire_to_meet, initiative, evidence_sufficiency, created_at")
      .eq("relationship_id", relationshipId)
      .order("created_at", { ascending: true }),
  ]);
  if (factsResult.error || snapshotsResult.error) {
    return apiError("QUESTION_UNAVAILABLE", "記録を読み込めませんでした。", 503);
  }

  const answer = answerRelationshipQuestion(
    parsed.data.topic,
    (factsResult.data ?? []) as RelationshipQuestionFact[],
    (snapshotsResult.data ?? []) as RelationshipQuestionSnapshot[],
  );
  return NextResponse.json(answer);
}
