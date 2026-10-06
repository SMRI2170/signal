import { NextResponse } from "next/server";

import { apiError } from "@/lib/api-error";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const session = await createClient();
  const bearer = request.headers.get("authorization")?.match(/^Bearer\s+(.+)$/i)?.[1];
  const { data: claims, error: claimsError } = await session.auth.getClaims(bearer);
  const userId = claims?.claims?.sub;
  if (claimsError || !userId) return apiError("AUTH_REQUIRED", "ログイン後に確認してください。", 401);

  const { data, error } = await createAdminClient()
    .from("relationships")
    .select("id, display_name, updated_at, analysis_snapshots(romantic_interest, created_at)")
    .eq("user_id", userId)
    .order("updated_at", { ascending: false })
    .limit(20);
  if (error) return apiError("ANALYSIS_UNAVAILABLE", "データを取得できませんでした。", 503);

  const relationships = data.map((relationship) => {
    const latestSnapshot = [...relationship.analysis_snapshots].sort(
      (a, b) => b.created_at.localeCompare(a.created_at),
    )[0];
    return {
      id: relationship.id,
      displayName: relationship.display_name,
      signalLevel: latestSnapshot?.romantic_interest ?? null,
      updatedAt: relationship.updated_at,
    };
  });

  return NextResponse.json({ relationships });
}
