import { Router, Request, Response } from "express";
import { indexLimiter } from "../middleware/rateLimit.js";
import { indexBenefitData } from "../lib/indexer.js";

const router = Router();

router.post("/index", indexLimiter, async (req: Request, res: Response): Promise<void> => {
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
  try {
    const result = await indexBenefitData();
    res.json({ success: true, message: "Benefit data indexed successfully", stats: result });
  } catch (err) {
    res.status(500).json({ error: "Indexing failed", details: (err as Error).message });
  }
});

export default router;
