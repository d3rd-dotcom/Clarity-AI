import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { CohereClient } from "cohere-ai";

let _cohere: CohereClient | null = null;
export function getCohere(): CohereClient {
  if (!_cohere) {
    const key = process.env.COHERE_API_KEY;
    if (!key) throw new Error("COHERE_API_KEY is not set in environment variables");
    _cohere = new CohereClient({ token: key });
  }
  return _cohere;
}

// Explicit SupabaseClient type (NOT ReturnType<typeof createClient>) — the
// generic defaults on createClient() in supabase-js 2.x do not resolve
// cleanly through ReturnType<>, which silently turns .rpc() call args into
// `never`/`undefined` and breaks `tsc --noEmit` across the whole codebase.
let _supabase: SupabaseClient | null = null;
export function getSupabase(): SupabaseClient {
  if (!_supabase) {
    const url = process.env.SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !key) throw new Error("SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must both be set");
    _supabase = createClient(url, key);
  }
  return _supabase;
}
