import { NextResponse, type NextRequest } from "next/server";

import { createClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");
  const destination = new URL("/analyze", request.url);

  if (!code) {
    destination.searchParams.set("auth", "failed");
    return NextResponse.redirect(destination);
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);

  destination.searchParams.set("auth", error ? "failed" : "complete");
  return NextResponse.redirect(destination);
}
