import { NextResponse } from "next/server";

import { apiError } from "@/lib/api-error";
import { fakeJudge } from "@/lib/judge/fake-judge";
import { validateFactsRequestSchema } from "@/lib/judge/types";

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const parsed = validateFactsRequestSchema.safeParse(body);

  if (!parsed.success) {
    return apiError("INVALID_REQUEST", "入力内容を確認してください。", 400);
  }

  const results = await fakeJudge.validateFacts(parsed.data.facts);
  return NextResponse.json(results);
}
