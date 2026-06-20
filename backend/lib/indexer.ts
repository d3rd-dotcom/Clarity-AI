import { readFileSync, readdirSync } from "fs";
import { join } from "path";
import { embedPassages } from "./embed.js";
import { getSupabase } from "./clients.js";

// PROD-001: This file used to compute __dirname via
// dirname(fileURLToPath(import.meta.url)) to locate data/benefits. That
// only works when the code actually runs as an ES module. The production
// build (esbuild --format=cjs) bundles this into CommonJS, where
// import.meta is unavailable and becomes `undefined` — so
// fileURLToPath(undefined) threw `ERR_INVALID_ARG_TYPE` at import time,
// crashing the server before app.listen() ever ran. Resolving from
// process.cwd() instead works identically in dev (tsx/ESM), in the seed
// script, and in the bundled CJS production build, because npm always
// runs these scripts with the backend/ folder as the working directory.
const BENEFITS_DIR = join(process.cwd(), "data", "benefits");

interface BenefitChunkRaw { chunk_type: string; content: string; }
interface BenefitFile { benefit_name: string; gov_url: string; last_updated: string; chunks: BenefitChunkRaw[]; }
export interface IndexResult { files_processed: number; chunks_indexed: number; rows_inserted: number; }

export async function indexBenefitData(): Promise<IndexResult> {
  const supabase = getSupabase();
  const files = readdirSync(BENEFITS_DIR).filter((f) => f.endsWith(".json"));
  if (files.length === 0) throw new Error("No benefit JSON files found in data/benefits/");

  const allChunks: Array<{ benefit_name: string; chunk_type: string; content: string; source_url: string; last_updated: string; }> = [];
  for (const file of files) {
    const raw = readFileSync(join(BENEFITS_DIR, file), "utf-8");
    const data = JSON.parse(raw) as BenefitFile;
    for (const chunk of data.chunks) {
      allChunks.push({ benefit_name: data.benefit_name, chunk_type: chunk.chunk_type, content: chunk.content, source_url: data.gov_url, last_updated: data.last_updated });
    }
  }

  const allEmbeddings = await embedPassages(allChunks.map((c) => c.content));
  if (allEmbeddings.length !== allChunks.length) {
    throw new Error(`Embedding count mismatch: got ${allEmbeddings.length}, expected ${allChunks.length}`);
  }

  const { error: truncateError } = await supabase.rpc("truncate_benefit_chunks");
  if (truncateError) {
    const { error: deleteError } = await supabase.from("benefit_chunks").delete().neq("id", "00000000-0000-0000-0000-000000000000");
    if (deleteError) console.warn(`[indexer] Delete warning: ${deleteError.message}`);
  }

  const rows = allChunks.map((chunk, i) => ({
    benefit_name: chunk.benefit_name, chunk_type: chunk.chunk_type, content: chunk.content,
    source_url: chunk.source_url, last_updated: chunk.last_updated, embedding: allEmbeddings[i],
  })) as any[];

  const { data: insertedData, error: insertError } = await supabase.from("benefit_chunks").insert(rows as any).select("id");
  if (insertError) throw new Error(`Supabase insert failed: ${insertError.message}`);

  return { files_processed: files.length, chunks_indexed: allChunks.length, rows_inserted: insertedData?.length ?? 0 };
}
