import rateLimit from "express-rate-limit";

// ─── General API rate limit ──────────────────────────────────────────────────
// 30 requests per minute per IP — matches Cerebras free tier RPM
// so there's no point letting a single user burn more than this
export const generalLimiter = rateLimit({
  windowMs: 60 * 1000,       // 1 minute window
  max: 30,
  standardHeaders: true,     // sends RateLimit-* headers
  legacyHeaders: false,
  message: {
    error: "Too many requests. Please wait a moment before trying again.",
    retry_after_seconds: 60
  }
});

// ─── Tighter limit for the assess endpoint (costs tokens) ───────────────────
export const assessLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10,                   // 10 eligibility checks per minute per IP
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: "Too many eligibility checks. Please wait before submitting again.",
    retry_after_seconds: 60
  }
});

// ─── Very tight limit for the index endpoint ─────────────────────────────────
// This endpoint embeds all benefits — it's expensive and should only run once
export const indexLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,  // 1 hour window
  max: 5,
  message: {
    error: "Index endpoint rate limit reached.",
    retry_after_seconds: 3600
  }
});
