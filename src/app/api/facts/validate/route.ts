import { NextResponse } from "next/server";

import { apiError } from "@/lib/api-error";
import { getJudgeProvider } from "@/lib/judge";
import { JudgeProviderUnavailableError } from "@/lib/judge/provider";
import { validateFactsRequestSchema } from "@/lib/judge/types";
import { translateFactInputs } from "@/lib/judge/translate-facts";
import { getFactTranslator } from "@/lib/judge/translator-registry";
import { FactTranslationError } from "@/lib/judge/translator";
import { checkRateLimit, guestRateLimitKey } from "@/lib/rate-limit";

export async function POST(request: Request) {
  if (!checkRateLimit(guestRateLimitKey(request, "validate"), 20, 10 * 60 * 1_000).allowed) {
    return apiError("RATE_LIMITED", "しばらく待ってからもう一度お試しください。", 429);
  }
  const body = await request.json().catch(() => null);
  const parsed = validateFactsRequestSchema.safeParse(body);

  if (!parsed.success) {
    return apiError("INVALID_REQUEST", "入力内容を確認してください。", 400);
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

  try {
    const results = await getJudgeProvider().validateFacts(translated.inputs);
    // Annotate each result with translation metadata so the client knows
    // whether translation actually happened.
    const annotated = results.map((result, index) => ({
      ...result,
      translationSkipped: translated.translations[index]?.skipped ?? true,
    }));
    return NextResponse.json(annotated);
  } catch (error) {
    if (error instanceof JudgeProviderUnavailableError) {
      return apiError("VALIDATION_UNAVAILABLE", "現在判定が混み合っています。少し待ってからもう一度お試しください。", 503);
    }
    throw error;
  }
}
