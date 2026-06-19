// === backend/lib/clients.ts ===
// CQ-004: Single source-of-truth for all external client singletons.
// Previously, both embed.ts and retrieve.ts maintained their own _cohere
// and _supabase module-level nulls with identical init logic. health.ts
// created a brand-new Supabase client on every request. All three now
// import from here, ensuring exactly one connection pool per process.

import { createClient } from "@supabase/supabase-js";
import { CohereClient } from "cohere-ai";

// ─── Cohere singleton ─────────────────────────────────────────────────────────
let _cohere: CohereClient | null = null;

/**
 * Returns the shared CohereClient, initialising it on first call.
 * Throws at call time (not module load time) with a clear message if
 * COHERE_API_KEY is missing, so the server startup check in server.ts
 * catches it first under normal conditions.
 */
export function getCohere(): CohereClient {
  if (!_cohere) {
    const key = process.env.COHERE_API_KEY;
    if (!key) {
      throw new Error("COHERE_API_KEY is not set in environment variables");
    }
    _cohere = new CohereClient({ token: key });
  }
  return _cohere;
}

// ─── Supabase singleton ───────────────────────────────────────────────────────
let _supabase: ReturnType<typeof createClient> | null = null;

/**
 * Returns the shared Supabase service-role client, initialising on first call.
 * The service-role key must NEVER be exposed to the browser — this client
 * is server-side only and bypasses Row Level Security.
 */
export function getSupabase(): ReturnType<typeof createClient> {
  if (!_supabase) {
    const url = process.env.SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !key) {
      throw new Error(
        "SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must both be set"
      );
    }
    _supabase = createClient(url, key);
  }
  return _supabase;
}
