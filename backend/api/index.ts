import { Router, Request, Response } from "express";
import { createClient } from "@supabase/supabase-js";
import { indexLimiter } from "../middleware/rateLimit.js";
import { embedPassages } from "../lib/embed.js";
import { readFileSync, readdirSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const router = Router();
const __dirname = dirname(fileURLToPath(import.meta.url));

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

// ─── POST /api/index ──────────────────────────────────────────────────────────
// Reads all benefit JSON files, generates embeddings, stores in Supabase.
// Protected by INDEX_SECRET header — call this ONCE before the hackathon demo.
//
// Usage:
//   curl -X POST http://localhost:3001/api/index \
//        -H "x-index-secret: your-secret-here"
//
router.post(
  "/index",
  indexLimiter,
  async (req: Request, res: Response): Promise<void> => {
    // ── Auth check ────────────────────────────────────────────────────────────
    const secret = req.headers["x-index-secret"];
    const expectedSecret = process.env.INDEX_SECRET;

    if (!expectedSecret) {
      res.status(500).json({ error: "INDEX_SECRET is not configured on the server" });
      return;
    }
    if (!secret || secret !== expectedSecret) {
      res.status(401).json({ error: "Invalid or missing x-index-secret header" });
      return;
    }

    // ── Setup Supabase client ─────────────────────────────────────────────────
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!supabaseUrl || !supabaseKey) {
      res.status(500).json({ error: "Supabase credentials not configured" });
      return;
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    try {
      // ── Read all benefit JSON files ───────────────────────────────────────
      const benefitsDir = join(__dirname, "../data/benefits");
      const files = readdirSync(benefitsDir).filter((f) => f.endsWith(".json"));

      if (files.length === 0) {
        res.status(400).json({ error: "No benefit JSON files found in data/benefits/" });
        return;
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

      console.log(`[index] Loaded ${allChunks.length} chunks from ${files.length} files`);

      // ── Generate embeddings for all chunks ────────────────────────────────
      console.log("[index] Generating Cohere embeddings...");
      const embeddings = await embedPassages(allChunks.map((c) => c.content));

      if (embeddings.length !== allChunks.length) {
        throw new Error(
          `Embedding count mismatch: got ${embeddings.length}, expected ${allChunks.length}`
        );
      }

      // ── Upsert into Supabase ──────────────────────────────────────────────
      console.log("[index] Upserting into Supabase...");
      const rows = allChunks.map((chunk, i) => ({
        benefit_name: chunk.benefit_name,
        chunk_type: chunk.chunk_type,
        content: chunk.content,
        source_url: chunk.source_url,
        last_updated: chunk.last_updated,
        embedding: embeddings[i]
      }));

      // Delete existing rows first for clean re-index
      const { error: deleteError } = await supabase
        .from("benefit_chunks")
        .delete()
        .neq("id", "00000000-0000-0000-0000-000000000000"); // delete all

      if (deleteError) {
        console.warn("[index] Delete warning:", deleteError.message);
        // Non-fatal — continue anyway
      }

      const { error: insertError, data: insertedData } = await supabase
        .from("benefit_chunks")
        .insert(rows)
        .select("id");

      if (insertError) {
        throw new Error(`Supabase insert failed: ${insertError.message}`);
      }

      res.json({
        success: true,
        message: "Benefit data indexed successfully",
        stats: {
          files_processed: files.length,
          chunks_indexed: allChunks.length,
          rows_inserted: insertedData?.length ?? 0
        }
      });

    } catch (err) {
      console.error("[index] Error:", err);
      res.status(500).json({
        error: "Indexing failed",
        details: (err as Error).message
      });
    }
  }
);

export default router;
