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

const createRelationshipSchema = z.object({
  displayName: z.string().trim().min(1).max(80),
  facts: z.array(factInputSchema).min(3).max(10),
  idempotencyKey: z.uuid(),
  jevConsent: z.literal(true),
}).strict();

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const parsed = createRelationshipSchema.safeParse(body);
  if (!parsed.success) return apiError("INVALID_REQUEST", "保存内容を確認してください。", 400);

  const sessionClient = await createClient();
  const { data: claimsData, error: claimsError } = await sessionClient.auth.getClaims();
  const userId = claimsData?.claims?.sub;
  if (claimsError || !userId) return apiError("AUTH_REQUIRED", "ログイン後に保存してください。", 401);

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
    const judge = getJudgeProvider();
    const validations = await judge.validateFacts(translated.inputs);
    if (validations.some((validation) => validation.status !== "observable")) {
      return apiError("FACT_NOT_OBSERVABLE", "観測可能なFactに書き換えてください。", 422);
    }

    const analysis = await judge.analyze(translated.inputs);
    const admin = createAdminClient();
    const { data: relationshipId, error } = await admin.rpc("create_initial_relationship_analysis", {
      p_user_id: userId,
      p_display_name: parsed.data.displayName,
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
      p_idempotency_key: parsed.data.idempotencyKey,
    });

    if (error || !relationshipId) throw error ?? new Error("Relationship was not created.");
    return NextResponse.json({ relationshipId });
  } catch (error) {
    if (error instanceof JudgeProviderUnavailableError) {
      return apiError("ANALYSIS_UNAVAILABLE", "現在分析が混み合っています。少し待ってからもう一度お試しください。", 503);
    }
    return apiError("ANALYSIS_UNAVAILABLE", "保存を完了できませんでした。もう一度お試しください。", 503);
  }
}

export async function GET() {
  const supabase = await createClient();
  const { data: claimsData, error: claimsError } = await supabase.auth.getClaims();
  if (claimsError || !claimsData?.claims?.sub) {
    return apiError("AUTH_REQUIRED", "ログイン後に確認してください。", 401);
  }

  const { data, error } = await supabase
    .from("relationships")
    .select("id, display_name, created_at, updated_at, analysis_snapshots(romantic_interest, created_at)")
    .order("updated_at", { ascending: false });
  if (error) return apiError("ANALYSIS_UNAVAILABLE", "データを取得できませんでした。", 503);

  return NextResponse.json(
    data.map((relationship) => {
      const snapshots = [...relationship.analysis_snapshots].sort(
        (a, b) => b.created_at.localeCompare(a.created_at),
      );
      return { ...relationship, current: snapshots[0] ?? null, previous: snapshots[1] ?? null };
    }),
  );
}
