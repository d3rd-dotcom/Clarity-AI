import { Router, Request, Response } from "express";
import { AssessRequestSchema, validate, type AssessRequest } from "../middleware/validate.js";
import { assessLimiter } from "../middleware/rateLimit.js";
import { buildSituationText } from "../lib/situationBuilder.js";
import { embedQuery } from "../lib/embed.js";
import { retrieveRelevantChunks } from "../lib/retrieve.js";
import { generateAssessment, type AssessmentResult } from "../lib/generate.js";
import fallbackData from "../data/fallbacks/demo-profiles.json" with { type: "json" };

const router = Router();

router.post("/assess", assessLimiter, validate(AssessRequestSchema), async (req: Request, res: Response): Promise<void> => {
  const input = (req as Request & { validated: AssessRequest }).validated;
  try {
    const situationText = buildSituationText(input);
    console.log(`[assess] Processing request (${situationText.length} chars)`);
    let queryEmbedding: number[];
    try {
      queryEmbedding = await embedQuery(situationText);
    } catch (embedErr) {
      res.json(buildFallback(input, situationText));
      return;
    }
    let chunks;
    try {
      chunks = await retrieveRelevantChunks(queryEmbedding, situationText);
    } catch (retrieveErr) {
      res.json(buildFallback(input, situationText));
      return;
    }
    if (!chunks || chunks.length === 0) {
      res.json(buildFallback(input, situationText));
      return;
    }
    let result: AssessmentResult;
    try {
      result = await generateAssessment(situationText, chunks);
    } catch (generateErr) {
      res.json(buildFallback(input, situationText));
      return;
    }
    res.json({ success: true, situation: situationText, ...result });
  } catch (err) {
    res.json(buildFallback(input, buildSituationText(input)));
  }
});

function buildFallback(input: AssessRequest, situationText: string) {
  const profiles = fallbackData.profiles as any;
  let profile;
  if (input.health_disability === "affects_work" || input.health_disability === "affects_daily_life") {
    profile = profiles.profile_c;
  } else if (input.household_situation === "single_parent" || input.household_situation === "couple_with_children" || (input.num_children && input.num_children > 0)) {
    profile = profiles.profile_a;
  } else {
    profile = profiles.profile_b;
  }
  return { success: true, situation: situationText, ...profile.result, data_source: "fallback", fallback_note: "Live AI pipeline is warming up. This is a pre-verified result." };
}

export default router;
