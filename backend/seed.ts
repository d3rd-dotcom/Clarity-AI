/**
 * SEED SCRIPT — Run once to index benefit data into Supabase.
 *
 * Usage:
 *   npm run seed
 *
 * What it does:
 *   1. Reads all JSON files from data/benefits/
 *   2. Generates Cohere embeddings for each chunk
 *   3. Inserts into Supabase benefit_chunks table
 *
 * Prerequisites:
 *   - Run setup.sql in Supabase SQL Editor first
 *   - .env file must have COHERE_API_KEY, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
 */

import dotenv from "dotenv";
dotenv.config();

import { createClient } from "@supabase/supabase-js";
import { CohereClient } from "cohere-ai";
import { readFileSync, readdirSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));

// ─── Validate env ─────────────────────────────────────────────────────────────
const REQUIRED = ["COHERE_API_KEY", "SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY"];
const missing = REQUIRED.filter((k) => !process.env[k]);
if (missing.length > 0) {
  console.error(`❌ Missing: ${missing.join(", ")}`);
  process.exit(1);
}

const cohere = new CohereClient({ token: process.env.COHERE_API_KEY! });
const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// ─── Load benefit files ───────────────────────────────────────────────────────
interface BenefitFile {
  benefit_name: string;
  gov_url: string;
  last_updated: string;
  chunks: Array<{ chunk_type: string; content: string }>;
}

const benefitsDir = join(__dirname, "data/benefits");
const files = readdirSync(benefitsDir).filter((f) => f.endsWith(".json"));

console.log(`\n📂 Found ${files.length} benefit files`);

const allChunks: Array<{
  benefit_name: string;
  chunk_type: string;
  content: string;
  source_url: string;
  last_updated: string;
}> = [];

for (const file of files) {
  const data = JSON.parse(readFileSync(join(benefitsDir, file), "utf-8")) as BenefitFile;
  console.log(`   ✓ ${data.benefit_name} — ${data.chunks.length} chunks`);
  for (const chunk of data.chunks) {
    allChunks.push({
      benefit_name: data.benefit_name,
      chunk_type: chunk.chunk_type,
      content: chunk.content,
      source_url: data.gov_url,
      last_updated: data.last_updated
    });
  }
}

console.log(`\n📊 Total chunks to embed: ${allChunks.length}`);

// ─── Generate embeddings ──────────────────────────────────────────────────────
console.log("\n🔮 Generating Cohere embeddings...");

const embedResponse = await cohere.embed({
  texts: allChunks.map((c) => c.content),
  model: "embed-english-v3.0",
  inputType: "search_document",
  embeddingTypes: ["float"]
});

// Handle Cohere SDK response shape
const embeddings = Array.isArray(embedResponse.embeddings[0])
  ? (embedResponse.embeddings as number[][])
  : (embedResponse.embeddings as unknown as { float: number[][] }).float;

if (embeddings.length !== allChunks.length) {
  console.error(`❌ Embedding count mismatch: got ${embeddings.length}, expected ${allChunks.length}`);
  process.exit(1);
}

console.log(`   ✓ Generated ${embeddings.length} embeddings (1024 dimensions each)`);

// ─── Clear existing data ──────────────────────────────────────────────────────
console.log("\n🗑️  Clearing existing benefit_chunks...");
const { error: deleteError } = await supabase
  .from("benefit_chunks")
  .delete()
  .neq("id", "00000000-0000-0000-0000-000000000000");

if (deleteError) {
  console.warn(`   ⚠️  Delete warning: ${deleteError.message}`);
}

// ─── Insert into Supabase ─────────────────────────────────────────────────────
console.log("\n⬆️  Inserting into Supabase...");

const rows = allChunks.map((chunk, i) => ({
  benefit_name: chunk.benefit_name,
  chunk_type: chunk.chunk_type,
  content: chunk.content,
  source_url: chunk.source_url,
  last_updated: chunk.last_updated,
  embedding: embeddings[i]
}));

const { data: inserted, error: insertError } = await supabase
  .from("benefit_chunks")
  .insert(rows)
  .select("id");

if (insertError) {
  console.error(`❌ Insert failed: ${insertError.message}`);
  process.exit(1);
}

console.log(`   ✓ Inserted ${inserted?.length ?? 0} rows`);

// ─── Verify ───────────────────────────────────────────────────────────────────
const { count } = await supabase
  .from("benefit_chunks")
  .select("*", { count: "exact", head: true });

console.log(`\n✅ Seeding complete! benefit_chunks table now has ${count} rows.`);
console.log("   You can now start the server with: npm run dev\n");
