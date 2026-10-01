import { NextResponse } from "next/server";

import { apiError } from "@/lib/api-error";
import { getJudgeProvider } from "@/lib/judge";
import { JudgeProviderUnavailableError } from "@/lib/judge/provider";
import { validateFactsRequestSchema } from "@/lib/judge/types";

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const parsed = validateFactsRequestSchema.safeParse(body);

  if (!parsed.success) {
    return apiError("INVALID_REQUEST", "入力内容を確認してください。", 400);
  }

  try {
    const results = await getJudgeProvider().validateFacts(parsed.data.facts);
    return NextResponse.json(results);
  } catch (error) {
    if (error instanceof JudgeProviderUnavailableError) {
      return apiError("VALIDATION_UNAVAILABLE", "現在判定が混み合っています。少し待ってからもう一度お試しください。", 503);
    }
    throw error;
  }
}
