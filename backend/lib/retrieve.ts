// === backend/lib/retrieve.ts ===
// CQ-004: Removed the module-level _supabase and _cohere nulls that previously
// duplicated the init logic already present in embed.ts. Both clients are now
// sourced from the shared singletons in lib/clients.ts.

import { getCohere, getSupabase } from "./clients.js";

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

// ─── Cosine similarity search via Supabase RPC ───────────────────────────────
// Calls match_benefit_chunks(), the SQL function defined in setup.sql.
// The RPC approach is required because the Supabase JS client cannot use
// pgvector's <=> operator directly in a query builder chain.
export async function searchChunks(
  queryEmbedding: number[],
  topK: number = 10
): Promise<BenefitChunk[]> {
  const supabase = getSupabase();

  const { data, error } = await supabase.rpc("match_benefit_chunks", {
    query_embedding: queryEmbedding,
    match_count:     topK,
    match_threshold: 0.3, // Minimum cosine similarity — filters irrelevant chunks
  });

  if (error) {
    throw new Error(`Supabase vector search failed: ${error.message}`);
  }

  if (!data || data.length === 0) {
    return [];
  }

  return data as BenefitChunk[];
}

// ─── Cohere rerank — improves ordering after vector search ───────────────────
// Optional upgrade: reranking re-orders the top-K vector results by true
// semantic relevance to the query, which is more accurate than cosine
// similarity alone, especially for edge-case household situations.
export async function rerankChunks(
  query: string,
  chunks: BenefitChunk[],
  topN: number = 6
): Promise<BenefitChunk[]> {
  if (chunks.length === 0) return [];
  // No point reranking if we already have fewer chunks than we need
  if (chunks.length <= topN) return chunks;

  const cohere = getCohere();

  try {
    const response = await cohere.rerank({
      query,
      documents: chunks.map((c) => c.content),
      topN,
      model: "rerank-english-v3.0",
    });

    // Map reranked indices back to original chunk objects
    return response.results.map((r) => {
      const chunk = chunks[r.index];
      if (!chunk) {
        throw new Error(`Cohere rerank returned out-of-bounds index ${r.index}`);
      }
      return chunk;
    });
  } catch (err) {
    // Rerank is optional — if it fails, return the original vector-search
    // ordering truncated to topN. The LLM still produces a valid result.
    console.error(
      "Cohere rerank failed, using original ordering:",
      (err as Error).message
    );
    return chunks.slice(0, topN);
  }
}

// ─── Combined pipeline: search then optionally rerank ────────────────────────
export async function retrieveRelevantChunks(
  queryEmbedding: number[],
  situationText: string,
  topK: number = 10,
  topN: number = 6
): Promise<BenefitChunk[]> {
  const rawChunks = await searchChunks(queryEmbedding, topK);

  if (rawChunks.length === 0) return [];

  // Only invoke the rerank API if there are more results than we need —
  // reranking a list already <= topN is unnecessary network overhead.
  if (rawChunks.length <= topN) return rawChunks;

  return rerankChunks(situationText, rawChunks, topN);
}
