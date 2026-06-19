// === backend/server.ts ===
import express from "express";
import cors from "cors";
import helmet from "helmet";
import dotenv from "dotenv";
import { generalLimiter } from "./middleware/rateLimit.js";
import assessRouter from "./api/assess.js";
import indexRouter from "./api/index.js";
import healthRouter from "./api/health.js";

// ─── Load env vars before anything else ──────────────────────────────────────
dotenv.config();

// ─── Validate critical env vars at startup ────────────────────────────────────
// Fail loud at boot — not silently mid-request.
//
// SEC-002: FRONTEND_URL is required in production to prevent CORS from falling
// back to a hardcoded placeholder domain ("your-app.vercel.app") that could
// be registered by an attacker, or that would silently break the deployed
// frontend if the env var is simply forgotten.
const REQUIRED_ENV_BASE = [
  "COHERE_API_KEY",
  "SUPABASE_URL",
  "SUPABASE_SERVICE_ROLE_KEY",
];
const REQUIRED_ENV_PROD = ["FRONTEND_URL"];

const REQUIRED_ENV = [
  ...REQUIRED_ENV_BASE,
  ...(process.env.NODE_ENV === "production" ? REQUIRED_ENV_PROD : []),
];

const missing = REQUIRED_ENV.filter((key) => !process.env[key]);
if (missing.length > 0) {
  console.error(
    `\n❌ Missing required environment variables: ${missing.join(", ")}`
  );
  console.error("   Copy .env.example to .env and fill in your values.\n");
  process.exit(1);
}

// Warn if both LLM providers are absent — non-fatal, fallbacks still work
if (!process.env.CEREBRAS_API_KEY && !process.env.GROQ_API_KEY) {
  console.warn(
    "⚠️  Neither CEREBRAS_API_KEY nor GROQ_API_KEY is set. " +
    "Using static fallback responses only."
  );
}

// ─── App setup ────────────────────────────────────────────────────────────────
const app = express();
const PORT = parseInt(process.env.PORT ?? "3001", 10);

// ── Trust proxy (CQ-009) ──────────────────────────────────────────────────────
// Required for accurate IP extraction when the backend is behind a reverse
// proxy (Vercel edge, Railway, Render, etc.).
// Without this, express-rate-limit sees every request as coming from the
// same proxy IP, making per-IP rate limits ineffective.
// Value of 1 = trust exactly one hop of X-Forwarded-For.
app.set("trust proxy", 1);

// ── HTTP security headers (SEC-004) ──────────────────────────────────────────
// helmet sets X-Content-Type-Options, X-Frame-Options, Strict-Transport-Security,
// Referrer-Policy, Permissions-Policy, and more in a single call with
// OWASP-recommended defaults. Place this before all other middleware so it
// applies to every response, including error responses.
app.use(helmet());

// ── Request body limit ────────────────────────────────────────────────────────
app.use(express.json({ limit: "16kb" }));

// ── CORS (SEC-002) ────────────────────────────────────────────────────────────
// Production: restrict to the explicitly configured FRONTEND_URL only.
//   FRONTEND_URL is now required at startup (validated above), so the
//   ! non-null assertion is safe — process.exit(1) guards it.
// Development: allow standard local dev server ports.
const allowedOrigins =
  process.env.NODE_ENV === "production"
    ? [process.env.FRONTEND_URL!]
    : [
        "http://localhost:3000",
        "http://localhost:5173",
        "http://127.0.0.1:3000",
        "http://127.0.0.1:5173",
      ];

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no Origin header (curl, Postman, server-to-server)
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error(`CORS: origin ${origin} is not in the allowlist`));
      }
    },
    methods: ["GET", "POST"],
    allowedHeaders: ["Content-Type", "x-index-secret"],
  })
);

// ── Global rate limiter ────────────────────────────────────────────────────────
app.use(generalLimiter);

// ─── Routes ───────────────────────────────────────────────────────────────────
app.use("/api", healthRouter);
app.use("/api", assessRouter);
app.use("/api", indexRouter);

// ─── 404 handler ──────────────────────────────────────────────────────────────
app.use((_req, res) => {
  res.status(404).json({ error: "Endpoint not found" });
});

// ─── Global error handler ─────────────────────────────────────────────────────
// Must have exactly 4 parameters for Express to recognise it as an error handler.
app.use(
  (
    err: Error,
    _req: express.Request,
    res: express.Response,
    _next: express.NextFunction
  ) => {
    console.error("Unhandled error:", err.message);
    // Never leak stack traces in production
    res.status(500).json({
      error:
        process.env.NODE_ENV === "development"
          ? err.message
          : "Internal server error",
    });
  }
);

// ─── Start ────────────────────────────────────────────────────────────────────
app.listen(PORT, "0.0.0.0", () => {
  console.log(
    `\n✅ Clarity-Eligibility Backend running on http://0.0.0.0:${PORT}`
  );
  console.log(`   POST /api/assess   — RAG eligibility pipeline`);
  console.log(`   POST /api/index    — seed Supabase (protected)`);
  console.log(`   GET  /api/health   — health check\n`);
});

export default app;
