import { createClient } from "@supabase/supabase-js";
import { CohereClient } from "cohere-ai";

// ─── Types ───────────────────────────────────────────────────────────────────
export interface BenefitChunk {
  id: string;
  benefit_name: string;
  chunk_type: string;
  content: string;
  source_url: string;
  last_updated: string;
  similarity?: number;
}

// ─── Lazy clients ────────────────────────────────────────────────────────────
let _supabase: ReturnType<typeof createClient> | null = null;
let _cohere: CohereClient | null = null;

function getSupabase() {
  if (!_supabase) {
    const url = process.env.SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !key) {
      throw new Error("SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set");
    }
    _supabase = createClient(url, key);
  }
  return _supabase;
}

function getCohere() {
  if (!_cohere) {
    const key = process.env.COHERE_API_KEY;
    if (!key) throw new Error("COHERE_API_KEY is not set");
    _cohere = new CohereClient({ token: key });
  }
  return _cohere;
}

// ─── Cosine similarity search via Supabase RPC ───────────────────────────────
// Calls the match_benefit_chunks SQL function we create in setup.sql
export async function searchChunks(
  queryEmbedding: number[],
  topK: number = 10
): Promise<BenefitChunk[]> {
  const supabase = getSupabase();

  const { data, error } = await supabase.rpc("match_benefit_chunks", {
    query_embedding: queryEmbedding,
    match_count: topK,
    match_threshold: 0.3   // Minimum similarity — filters out irrelevant results
  });

  if (error) {
    throw new Error(`Supabase vector search failed: ${error.message}`);
  }

  if (!data || data.length === 0) {
    return [];
  }

  return data as BenefitChunk[];
}

// ─── Cohere rerank — improves ordering of retrieved chunks ───────────────────
// Optional but improves accuracy especially on edge cases
export async function rerankChunks(
  query: string,
  chunks: BenefitChunk[],
  topN: number = 6
): Promise<BenefitChunk[]> {
  if (chunks.length === 0) return [];
  if (chunks.length <= topN) return chunks; // No point reranking if already small

  const cohere = getCohere();

  try {
    const response = await cohere.rerank({
      query,
      documents: chunks.map((c) => c.content),
      topN,
      model: "rerank-english-v3.0"
    });

    // Map reranked indices back to original chunks
    return response.results.map((r) => {
      const chunk = chunks[r.index];
      if (!chunk) throw new Error(`Rerank returned invalid index ${r.index}`);
      return chunk;
    });
  } catch (err) {
    // ⚠️ Rerank is optional — if it fails, return original order truncated
    console.error("Cohere rerank failed, using original ordering:", err);
    return chunks.slice(0, topN);
  }
}

// ─── Combined: search then rerank ────────────────────────────────────────────
export async function retrieveRelevantChunks(
  queryEmbedding: number[],
  situationText: string,
  topK: number = 10,
  topN: number = 6
): Promise<BenefitChunk[]> {
  const rawChunks = await searchChunks(queryEmbedding, topK);

  if (rawChunks.length === 0) return [];

  // Only rerank if we got more chunks than we need
  if (rawChunks.length <= topN) return rawChunks;

  return rerankChunks(situationText, rawChunks, topN);
}
