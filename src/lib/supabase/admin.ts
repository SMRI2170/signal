import { createClient } from "@supabase/supabase-js";

import { getSupabasePublicConfig } from "./config";

export function createAdminClient() {
  const secretKey = process.env.SUPABASE_SECRET_KEY;
  if (!secretKey) throw new Error("Supabase secret configuration is missing.");

  const { url } = getSupabasePublicConfig();
  return createClient(url, secretKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
