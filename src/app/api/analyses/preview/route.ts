import { NextResponse } from "next/server";

import { apiError } from "@/lib/api-error";
import { fakeJudge } from "@/lib/judge/fake-judge";
import { previewAnalysisRequestSchema } from "@/lib/judge/types";

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const parsed = previewAnalysisRequestSchema.safeParse(body);

  if (!parsed.success) {
    return apiError("INSUFFICIENT_FACTS", "3件以上のFactを入力してください。", 400);
  }

  const validations = await fakeJudge.validateFacts(parsed.data.facts);
  if (validations.some((validation) => validation.status !== "observable")) {
    return apiError("FACT_NOT_OBSERVABLE", "観測可能なFactに書き換えてください。", 422);
  }

  const analysis = await fakeJudge.analyze(parsed.data.facts);
  return NextResponse.json(analysis);
}
