import { NextResponse } from "next/server";
import { z } from "zod";

import { apiError } from "@/lib/api-error";
import { getJudgeProvider } from "@/lib/judge";
import { JudgeProviderUnavailableError } from "@/lib/judge/provider";
import { factInputSchema } from "@/lib/judge/types";
import { translateFactInputs } from "@/lib/judge/translate-facts";
import { getFactTranslator } from "@/lib/judge/translator-registry";
import { FactTranslationError } from "@/lib/judge/translator";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

const inputSchema = z.object({
  facts: z.array(factInputSchema).min(1).max(10),
  idempotencyKey: z.uuid(),
  jevConsent: z.literal(true),
}).strict();

export async function POST(request: Request, { params }: { params: Promise<{ relationshipId: string }> }) {
  const { relationshipId } = await params;
  const parsed = inputSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return apiError("INVALID_REQUEST", "追加するFactを確認してください。", 400);
  const session = await createClient();
  const { data: claims } = await session.auth.getClaims();
  const userId = claims?.claims?.sub;
  if (!userId) return apiError("AUTH_REQUIRED", "ログイン後に保存してください。", 401);
  const translator = getFactTranslator();
  let translated;
  try {
    translated = await translateFactInputs(translator, parsed.data.facts);
  } catch (error) {
    if (error instanceof FactTranslationError) {
      return apiError("TRANSLATION_FAILED", "翻訳に失敗しました。少し待ってからお試しください。", error.retryable ? 502 : 422);
    }
    throw error;
  }
  try {
    const admin = createAdminClient();
    const { data: relationship } = await admin.from("relationships").select("id").eq("id", relationshipId).eq("user_id", userId).maybeSingle();
    if (!relationship) return apiError("NOT_FOUND", "対象の記録が見つかりません。", 404);
    const judge = getJudgeProvider();
    const validations = await judge.validateFacts(translated.inputs);
    if (validations.some((item) => item.status !== "observable")) {
      return NextResponse.json(
        {
          error: {
            code: "FACT_NOT_OBSERVABLE",
            message: "観測可能なFactに書き換えてください。",
            requestId: crypto.randomUUID(),
            retryable: false,
          },
          validations,
        },
        { status: 422 },
      );
    }
    const { data: existingFacts, error: factsError } = await admin.from("facts").select("id, text_original").eq("relationship_id", relationshipId).order("created_at");
    if (factsError) throw factsError;
    const combinedInputs = [
      ...(existingFacts ?? []).map((fact) => ({ clientFactId: fact.id, text: fact.text_original })),
      ...translated.inputs,
    ];
    const analysis = await judge.analyze(combinedInputs);
    const { data: snapshotId, error } = await admin.rpc("append_facts_and_analysis", {
      p_user_id: userId, p_relationship_id: relationshipId, p_idempotency_key: parsed.data.idempotencyKey,
      p_facts: parsed.data.facts.map((fact, index) => ({
        text_original: fact.text,
        text_english: translated.translations[index]?.textEnglish ?? null,
        translation_version: translated.translations[index]?.translationVersion ?? null,
        translation_skipped: translated.translations[index]?.skipped ?? true,
      })),
      p_analysis: {
        signalLevel: analysis.scores.signalLevel,
        romanticInterest: analysis.scores.romanticInterest,
        desireToMeet: analysis.scores.desireToMeet,
        initiative: analysis.scores.initiative,
        evidenceSufficiency: analysis.scores.evidenceSufficiency,
        modelVersion: analysis.modelVersion,
        rubricVersion: analysis.rubricVersion,
        scoreSchemaVersion: analysis.scoreSchemaVersion,
      },
    });
    if (error || !snapshotId) throw error ?? new Error("snapshot missing");

    const { data: snapshot, error: snapshotError } = await admin
      .from("analysis_snapshots")
      .select("signal_level, romantic_interest, previous_snapshot_id, score_schema_version")
      .eq("id", snapshotId)
      .maybeSingle();
    if (snapshotError || !snapshot) throw snapshotError ?? new Error("saved snapshot missing");

    let previousScore: number | null = null;
    let previousScoreSchemaVersion: string | null = null;
    if (snapshot.previous_snapshot_id) {
      const { data: previousSnapshot, error: previousSnapshotError } = await admin
        .from("analysis_snapshots")
        .select("signal_level, romantic_interest, score_schema_version")
        .eq("id", snapshot.previous_snapshot_id)
        .maybeSingle();
      if (previousSnapshotError) throw previousSnapshotError;
      previousScore = previousSnapshot?.signal_level ?? previousSnapshot?.romantic_interest ?? null;
      previousScoreSchemaVersion = previousSnapshot?.score_schema_version ?? "legacy-v1";
    }

    return NextResponse.json({
      snapshotId,
      analysis,
      currentScore: snapshot.signal_level ?? snapshot.romantic_interest,
      previousScore,
      scoreSchemaVersion: snapshot.score_schema_version ?? "legacy-v1",
      previousScoreSchemaVersion,
    });
  } catch (error) {
    if (error instanceof JudgeProviderUnavailableError) return apiError("ANALYSIS_UNAVAILABLE", "現在分析が混み合っています。", 503);
    return apiError("ANALYSIS_UNAVAILABLE", "再分析を完了できませんでした。", 503);
  }
}
