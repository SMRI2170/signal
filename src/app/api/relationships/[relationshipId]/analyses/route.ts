import { NextResponse } from "next/server";
import { z } from "zod";

import { apiError } from "@/lib/api-error";
import { getJudgeProvider } from "@/lib/judge";
import { JudgeProviderUnavailableError } from "@/lib/judge/provider";
import { factInputSchema } from "@/lib/judge/types";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

const inputSchema = z.object({ facts: z.array(factInputSchema).min(1).max(10), idempotencyKey: z.uuid() });

export async function POST(request: Request, { params }: { params: Promise<{ relationshipId: string }> }) {
  const { relationshipId } = await params;
  const parsed = inputSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return apiError("INVALID_REQUEST", "追加するFactを確認してください。", 400);
  const session = await createClient();
  const { data: claims } = await session.auth.getClaims();
  const userId = claims?.claims?.sub;
  if (!userId) return apiError("AUTH_REQUIRED", "ログイン後に保存してください。", 401);
  try {
    const admin = createAdminClient();
    const { data: relationship } = await admin.from("relationships").select("id").eq("id", relationshipId).eq("user_id", userId).maybeSingle();
    if (!relationship) return apiError("NOT_FOUND", "対象の記録が見つかりません。", 404);
    const judge = getJudgeProvider();
    const validations = await judge.validateFacts(parsed.data.facts);
    if (validations.some((item) => item.status !== "observable")) return apiError("FACT_NOT_OBSERVABLE", "観測可能なFactに書き換えてください。", 422);
    const { data: existingFacts, error: factsError } = await admin.from("facts").select("id, text_original").eq("relationship_id", relationshipId).order("created_at");
    if (factsError) throw factsError;
    const analysis = await judge.analyze([...(existingFacts ?? []).map((fact) => ({ clientFactId: fact.id, text: fact.text_original })), ...parsed.data.facts]);
    const { data: snapshotId, error } = await admin.rpc("append_facts_and_analysis", {
      p_user_id: userId, p_relationship_id: relationshipId, p_idempotency_key: parsed.data.idempotencyKey,
      p_facts: parsed.data.facts.map((fact, index) => ({ text_original: fact.text, text_english: validations[index]?.translatedFactEn })),
      p_analysis: { romanticInterest: analysis.scores.romanticInterest, desireToMeet: analysis.scores.desireToMeet, initiative: analysis.scores.initiative, evidenceSufficiency: analysis.scores.evidenceSufficiency, modelVersion: analysis.modelVersion, rubricVersion: analysis.rubricVersion },
    });
    if (error || !snapshotId) throw error ?? new Error("snapshot missing");
    return NextResponse.json({ snapshotId, analysis });
  } catch (error) {
    if (error instanceof JudgeProviderUnavailableError) return apiError("ANALYSIS_UNAVAILABLE", "現在分析が混み合っています。", 503);
    return apiError("ANALYSIS_UNAVAILABLE", "再分析を完了できませんでした。", 503);
  }
}
