/**
 * === backend/seed.ts ===
 * SEED SCRIPT — Run once to index benefit data into Supabase.
 *
 * Usage:
 *   npm run seed
 *
 * CQ-001: This script previously contained a full duplicate implementation
 * of file-reading, embedding, and Supabase upsert logic that also lived in
 * api/index.ts. Both now delegate to the single shared implementation in
 * lib/indexer.ts, so a schema change only needs to be made once.
 *
 * STR-005: Row clearing is now handled inside indexBenefitData() via the
 * truncate_benefit_chunks() RPC (see setup.sql), with a documented fallback
 * to the legacy .neq() delete-all pattern for projects that haven't re-run
 * setup.sql yet.
 *
 * Prerequisites:
 *   - Run setup.sql in the Supabase SQL Editor first
 *   - .env must have COHERE_API_KEY, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
 */

import dotenv from "dotenv";
dotenv.config();

import { indexBenefitData } from "./lib/indexer.js";

// ─── Validate env ─────────────────────────────────────────────────────────────
const REQUIRED = ["COHERE_API_KEY", "SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY"];
const missing = REQUIRED.filter((k) => !process.env[k]);
if (missing.length > 0) {
  console.error(`❌ Missing: ${missing.join(", ")}`);
  process.exit(1);
}

// ─── Run the shared indexing pipeline ─────────────────────────────────────────
console.log("\n📂 Starting benefit data seed...\n");

try {
  const result = await indexBenefitData();

  console.log(
    `\n✅ Seeding complete!`
  );
  console.log(`   Files processed:  ${result.files_processed}`);
  console.log(`   Chunks indexed:   ${result.chunks_indexed}`);
  console.log(`   Rows inserted:    ${result.rows_inserted}`);
  console.log("\n   You can now start the server with: npm run dev\n");
} catch (err) {
  console.error(`\n❌ Seeding failed: ${(err as Error).message}\n`);
  process.exit(1);
}
