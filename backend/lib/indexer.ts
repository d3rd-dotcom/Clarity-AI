// === backend/lib/indexer.ts ===
// CQ-001: Previously, seed.ts and api/index.ts each contained near-identical
// code for reading benefit JSON files, generating Cohere embeddings, clearing
// Supabase rows, and inserting fresh data. Any schema change required
// updating both files. This module is the single implementation; both
// callers are now thin wrappers around indexBenefitData().
//
// STR-005: Uses the truncate_benefit_chunks() Supabase RPC (defined in
// setup.sql) for a clean delete-all. Falls back to the legacy .neq() pattern
// if the function does not exist yet (e.g. setup.sql was run before this
// update), so existing Supabase projects continue to work.

import { readFileSync, readdirSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { embedPassages } from "./embed.js";
import { getSupabase } from "./clients.js";

const __dirname = dirname(fileURLToPath(import.meta.url));

// ─── Types ───────────────────────────────────────────────────────────────────

interface BenefitChunkRaw {
  chunk_type: string;
  content: string;
}

interface BenefitFile {
  benefit_name: string;
  gov_url: string;
  last_updated: string;
  chunks: BenefitChunkRaw[];
}

export interface IndexResult {
  files_processed: number;
  chunks_indexed: number;
  rows_inserted: number;
}

// ─── Main export ─────────────────────────────────────────────────────────────

/**
 * Reads all benefit JSON files from data/benefits/, generates Cohere
 * embeddings, clears the Supabase benefit_chunks table, and inserts fresh
 * rows. Returns a summary of what was processed.
 *
 * Called by both seed.ts (CLI) and api/index.ts (HTTP endpoint).
 */
export async function indexBenefitData(): Promise<IndexResult> {
  const supabase = getSupabase();

  // ── 1. Read benefit JSON files ────────────────────────────────────────────
  const benefitsDir = join(__dirname, "../data/benefits");
  const files = readdirSync(benefitsDir).filter((f) => f.endsWith(".json"));

  if (files.length === 0) {
    throw new Error("No benefit JSON files found in data/benefits/");
  }

  const allChunks: Array<{
    benefit_name: string;
    chunk_type: string;
    content: string;
    source_url: string;
    last_updated: string;
  }> = [];

  for (const file of files) {
    const raw = readFileSync(join(benefitsDir, file), "utf-8");
    const data = JSON.parse(raw) as BenefitFile;

    console.log(`[indexer]   ✓ ${data.benefit_name} — ${data.chunks.length} chunks`);

    for (const chunk of data.chunks) {
      allChunks.push({
        benefit_name: data.benefit_name,
        chunk_type:   chunk.chunk_type,
        content:      chunk.content,
        source_url:   data.gov_url,
        last_updated: data.last_updated,
      });
    }
  }

  console.log(
    `[indexer] Loaded ${allChunks.length} chunks from ${files.length} files`
  );

  // ── 2. Generate Cohere embeddings (batched inside embedPassages) ──────────
  // SEC-006 shape-checking and batching are handled by embedPassages() in embed.ts
  console.log("[indexer] Generating Cohere embeddings...");
  const allEmbeddings = await embedPassages(allChunks.map((c) => c.content));

  if (allEmbeddings.length !== allChunks.length) {
    throw new Error(
      `Embedding count mismatch: got ${allEmbeddings.length}, expected ${allChunks.length}`
    );
  }

  console.log(`[indexer] Generated ${allEmbeddings.length} embeddings`);

  // ── 3. Clear existing rows ────────────────────────────────────────────────
  // STR-005: Prefer the explicit truncate RPC. Fall back to the legacy
  // .neq() workaround if setup.sql has not yet been re-run on this project.
  console.log("[indexer] Clearing existing benefit_chunks...");
  const { error: truncateError } = await supabase.rpc(
    "truncate_benefit_chunks"
  );

  if (truncateError) {
    console.warn(
      `[indexer] truncate_benefit_chunks RPC unavailable (${truncateError.message}). ` +
      "Falling back to legacy delete. Re-run setup.sql to enable clean truncation."
    );
    const { error: deleteError } = await supabase
      .from("benefit_chunks")
      .delete()
      // Legacy pattern: .neq() on the zero UUID forces PostgREST to execute
      // an unfiltered DELETE. The zero UUID will never match gen_random_uuid().
      .neq("id", "00000000-0000-0000-0000-000000000000");

    if (deleteError) {
      // Non-fatal — old rows will simply be duplicated by the insert below.
      console.warn(`[indexer] Delete warning: ${deleteError.message}`);
    }
  }

  // ── 4. Insert fresh rows ──────────────────────────────────────────────────
  console.log("[indexer] Inserting into Supabase...");
  const rows = allChunks.map((chunk, i) => ({
    benefit_name: chunk.benefit_name,
    chunk_type:   chunk.chunk_type,
    content:      chunk.content,
    source_url:   chunk.source_url,
    last_updated: chunk.last_updated,
    embedding:    allEmbeddings[i],
  })) as any[];

  const { data: insertedData, error: insertError } = await supabase
    .from("benefit_chunks")
    .insert(rows as any)
    .select("id");

  if (insertError) {
    throw new Error(`Supabase insert failed: ${insertError.message}`);
  }

  return {
    files_processed: files.length,
    chunks_indexed:  allChunks.length,
    rows_inserted:   insertedData?.length ?? 0,
  };
}
