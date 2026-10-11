import { NextResponse } from "next/server";
import { z } from "zod";

import { apiError } from "@/lib/api-error";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request, { params }: { params: Promise<{ relationshipId: string }> }) {
  const { relationshipId } = await params;
  if (!z.uuid().safeParse(relationshipId).success) return apiError("NOT_FOUND", "対象の記録が見つかりません。", 404);

  const session = await createClient();
  const bearer = request.headers.get("authorization")?.match(/^Bearer\s+(.+)$/i)?.[1];
  const { data: claims, error: claimsError } = await session.auth.getClaims(bearer);
  const userId = claims?.claims?.sub;
  if (claimsError || !userId) return apiError("AUTH_REQUIRED", "ログイン後に確認してください。", 401);

  const admin = createAdminClient();
  const { data: relationship, error: relationshipError } = await admin
    .from("relationships")
    .select("id, display_name")
    .eq("id", relationshipId)
    .eq("user_id", userId)
    .maybeSingle();
  if (relationshipError) return apiError("ANALYSIS_UNAVAILABLE", "データを取得できませんでした。", 503);
  if (!relationship) return apiError("NOT_FOUND", "対象の記録が見つかりません。", 404);

  const [factsResult, snapshotsResult] = await Promise.all([
    admin
      .from("facts")
      .select("text_original, created_at")
      .eq("relationship_id", relationshipId)
      .order("created_at", { ascending: true }),
    admin
      .from("analysis_snapshots")
      .select("signal_level, romantic_interest, desire_to_meet, initiative, evidence_sufficiency, score_schema_version, fact_count, created_at")
      .eq("relationship_id", relationshipId)
      .order("created_at", { ascending: true }),
  ]);
  if (factsResult.error || snapshotsResult.error) {
    return apiError("ANALYSIS_UNAVAILABLE", "履歴を取得できませんでした。", 503);
  }

  return NextResponse.json({
    id: relationship.id,
    displayName: relationship.display_name,
    facts: (factsResult.data ?? []).map((fact) => ({ text: fact.text_original, createdAt: fact.created_at })),
    snapshots: (snapshotsResult.data ?? []).map((snapshot) => ({
      signalLevel: snapshot.signal_level ?? snapshot.romantic_interest,
      romanticInterest: snapshot.romantic_interest,
      desireToMeet: snapshot.desire_to_meet,
      initiative: snapshot.initiative,
      evidenceSufficiency: snapshot.evidence_sufficiency,
      scoreSchemaVersion: snapshot.score_schema_version ?? "legacy-v1",
      factCount: snapshot.fact_count,
      createdAt: snapshot.created_at,
    })),
  });
}
