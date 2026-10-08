import { NextResponse } from "next/server";

import { apiError } from "@/lib/api-error";
import { getJudgeProvider } from "@/lib/judge";
import { JudgeProviderUnavailableError } from "@/lib/judge/provider";
import { previewAnalysisRequestSchema } from "@/lib/judge/types";
import { translateFactInputs } from "@/lib/judge/translate-facts";
import { getFactTranslator } from "@/lib/judge/translator-registry";
import { FactTranslationError } from "@/lib/judge/translator";
import { checkRateLimit, guestRateLimitKey } from "@/lib/rate-limit";

export async function POST(request: Request) {
  if (!checkRateLimit(guestRateLimitKey(request, "preview"), 10, 10 * 60 * 1_000).allowed) {
    return apiError("RATE_LIMITED", "分析回数の上限です。しばらく待ってからお試しください。", 429);
  }
  const body = await request.json().catch(() => null);
  const parsed = previewAnalysisRequestSchema.safeParse(body);

  if (!parsed.success) {
    return apiError("INSUFFICIENT_FACTS", "3件以上のFactを入力してください。", 400);
  }

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

  const judge = getJudgeProvider();
  let validations;
  try {
    validations = await judge.validateFacts(translated.inputs);
  } catch (error) {
    if (error instanceof JudgeProviderUnavailableError) {
      return apiError("VALIDATION_UNAVAILABLE", "現在判定が混み合っています。少し待ってからもう一度お試しください。", 503);
    }
    throw error;
  }

  if (validations.some((validation) => validation.status !== "observable")) {
    return apiError("FACT_NOT_OBSERVABLE", "観測可能なFactに書き換えてください。", 422);
  }

  try {
    const analysis = await judge.analyze(translated.inputs);
    return NextResponse.json({
      ...analysis,
      translationSkipped: translated.translations.some((t) => t.skipped),
    });
  } catch (error) {
    if (error instanceof JudgeProviderUnavailableError) {
      return apiError("ANALYSIS_UNAVAILABLE", "現在分析が混み合っています。少し待ってからもう一度お試しください。", 503);
    }
    throw error;
  }
}
