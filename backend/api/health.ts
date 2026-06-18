import { Router, Request, Response } from "express";
import { createClient } from "@supabase/supabase-js";

const router = Router();

router.get("/health", async (_req: Request, res: Response): Promise<void> => {
  const checks: Record<string, boolean | string> = {
    server: true,
    cohere_key: !!process.env.COHERE_API_KEY,
    cerebras_key: !!process.env.CEREBRAS_API_KEY,
    groq_key: !!process.env.GROQ_API_KEY,
    supabase_configured: !!(process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY),
    supabase_ping: false
  };

  // Ping Supabase to verify connection
  if (checks.supabase_configured) {
    try {
      const supabase = createClient(
        process.env.SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
      );
      const { error } = await supabase
        .from("benefit_chunks")
        .select("id")
        .limit(1);

      checks.supabase_ping = !error;
      if (error) checks.supabase_error = error.message;
    } catch (e) {
      checks.supabase_ping = false;
      checks.supabase_error = (e as Error).message;
    }
  }

  const allGood = Object.values(checks).every((v) => v === true);

  res.status(allGood ? 200 : 206).json({
    status: allGood ? "ok" : "degraded",
    checks,
    timestamp: new Date().toISOString()
  });
});

export default router;
