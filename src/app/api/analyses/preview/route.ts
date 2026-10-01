import { NextResponse } from "next/server";

import { apiError } from "@/lib/api-error";
import { getJudgeProvider } from "@/lib/judge";
import { JudgeProviderUnavailableError } from "@/lib/judge/provider";
import { previewAnalysisRequestSchema } from "@/lib/judge/types";

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const parsed = previewAnalysisRequestSchema.safeParse(body);

  if (!parsed.success) {
    return apiError("INSUFFICIENT_FACTS", "3件以上のFactを入力してください。", 400);
  }

  const judge = getJudgeProvider();
  let validations;
  try {
    validations = await judge.validateFacts(parsed.data.facts);
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
    const analysis = await judge.analyze(parsed.data.facts);
    return NextResponse.json(analysis);
  } catch (error) {
    if (error instanceof JudgeProviderUnavailableError) {
      return apiError("ANALYSIS_UNAVAILABLE", "現在分析が混み合っています。少し待ってからもう一度お試しください。", 503);
    }
    throw error;
  }
}
