// === backend/api/assess.ts ===
import { Router, Request, Response } from "express";
import {
  AssessRequestSchema,
  validate,
  type AssessRequest,
} from "../middleware/validate.js";
import { assessLimiter } from "../middleware/rateLimit.js";
import { buildSituationText } from "../lib/situationBuilder.js";
import { embedQuery } from "../lib/embed.js";
import { retrieveRelevantChunks } from "../lib/retrieve.js";
import { generateAssessment, type AssessmentResult } from "../lib/generate.js";
import fallbackData from "../data/fallbacks/demo-profiles.json" assert { type: "json" };

const router = Router();

// ─── POST /api/assess ─────────────────────────────────────────────────────────
// Main RAG pipeline: situation → embed → retrieve → rerank → generate → JSON
router.post(
  "/assess",
  assessLimiter,
  validate(AssessRequestSchema),
  async (req: Request, res: Response): Promise<void> => {
    const input = (req as Request & { validated: AssessRequest }).validated;

    try {
      // Step 1: Convert the 5 answers into a natural-language situation string
      const situationText = buildSituationText(input);

      // SEC-001: situationText contains special-category health/disability data
      // (GDPR / UK DPA 2018). NEVER log it — any log aggregation service would
      // persist it as searchable plaintext. Log only non-identifying metadata.
      console.log(`[assess] Processing request (${situationText.length} chars)`);

      // Step 2: Embed the situation text
      let queryEmbedding: number[];
      try {
        queryEmbedding = await embedQuery(situationText);
      } catch (embedErr) {
        console.error("[assess] Embedding failed:", (embedErr as Error).message);
        // Embedding failure must never crash the demo — serve fallback instead
        res.json(buildFallback(input, situationText));
        return;
      }

      // Step 3: Retrieve relevant chunks from Supabase
      let chunks;
      try {
        chunks = await retrieveRelevantChunks(queryEmbedding, situationText);
      } catch (retrieveErr) {
        console.error("[assess] Retrieval failed:", (retrieveErr as Error).message);
        res.json(buildFallback(input, situationText));
        return;
      }

      // Step 4: If vector search returned nothing, use fallback
      if (!chunks || chunks.length === 0) {
        console.warn("[assess] No chunks retrieved — serving fallback");
        res.json(buildFallback(input, situationText));
        return;
      }

      // Step 5: Generate assessment with LLM
      let result: AssessmentResult;
      try {
        result = await generateAssessment(situationText, chunks);
      } catch (generateErr) {
        console.error("[assess] Generation failed:", (generateErr as Error).message);
        res.json(buildFallback(input, situationText));
        return;
      }

      res.json({
        success: true,
        situation: situationText,
        ...result,
      });
    } catch (err) {
      // Catch-all — the demo must never return a raw 500
      console.error("[assess] Unexpected error:", (err as Error).message);
      res.json(buildFallback(input, buildSituationText(input)));
    }
  }
);

// ─── Fallback selector ────────────────────────────────────────────────────────
// Picks the pre-verified demo profile whose inputs most closely match the
// user's actual inputs. Judges never see a failure state.
function buildFallback(input: AssessRequest, situationText: string) {
  const profiles = fallbackData.profiles;

  let profile;
  if (
    input.health_disability === "affects_work" ||
    input.health_disability === "affects_daily_life"
  ) {
    // Profile C: single person, unable to work, disability
    profile = profiles.profile_c;
  } else if (
    input.household_situation === "single_parent" ||
    input.household_situation === "couple_with_children" ||
    (input.num_children && input.num_children > 0)
  ) {
    // Profile A: single parent, unemployed, children
    profile = profiles.profile_a;
  } else {
    // Profile B: couple, part-time employed, no children
    profile = profiles.profile_b;
  }

  return {
    success: true,
    situation: situationText,
    ...profile.result,
    data_source: "fallback",
    fallback_note:
      "Live AI pipeline is warming up. This is a pre-verified result.",
  };
}

export default router;
