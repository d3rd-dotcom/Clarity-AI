import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { generalLimiter } from "./middleware/rateLimit.js";
import assessRouter from "./api/assess.js";
import indexRouter from "./api/index.js";
import healthRouter from "./api/health.js";

// ─── Load env vars before anything else ──────────────────────────────────────
dotenv.config();

// ─── Validate critical env vars at startup ────────────────────────────────────
// Fail loud at boot — not silently mid-request
const REQUIRED_ENV = ["COHERE_API_KEY", "SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY"];
const missing = REQUIRED_ENV.filter((key) => !process.env[key]);
if (missing.length > 0) {
  console.error(`\n❌ Missing required environment variables: ${missing.join(", ")}`);
  console.error("   Copy .env.example to .env and fill in your values.\n");
  process.exit(1);
}

// Warn if both LLM providers are missing (non-fatal — fallback still works)
if (!process.env.CEREBRAS_API_KEY && !process.env.GROQ_API_KEY) {
  console.warn("⚠️  Neither CEREBRAS_API_KEY nor GROQ_API_KEY is set. Using static fallbacks only.");
}

// ─── App setup ────────────────────────────────────────────────────────────────
const app = express();
app.set("trust proxy", 1)
const PORT = parseInt(process.env.PORT ?? "3001", 10);

// ── Request body limit (prevent giant payloads) ───────────────────────────────
app.use(express.json({ limit: "16kb" }));

// ── CORS ──────────────────────────────────────────────────────────────────────
// In dev: allow any origin (for local frontend testing)
// In prod: restrict to your Vercel domain
const allowedOrigins =
  process.env.NODE_ENV === "production"
    ? [process.env.FRONTEND_URL ?? "https://your-app.vercel.app"]
    : ["http://localhost:3000", "http://localhost:5173", "http://127.0.0.1:3000"];

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (curl, Postman)
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error(`CORS: origin ${origin} not allowed`));
      }
    },
    methods: ["GET", "POST"],
    allowedHeaders: ["Content-Type", "x-index-secret"]
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
// ⚠️ Must have 4 params for Express to recognize it as error handler
app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error("Unhandled error:", err.message);
  // Never leak stack traces in production
  res.status(500).json({
    error: process.env.NODE_ENV === "development" ? err.message : "Internal server error"
  });
});

// ─── Start ────────────────────────────────────────────────────────────────────
app.listen(PORT, "0.0.0.0", () => {
  console.log(`\n✅ Clarity-Eligibility Backend running on http://0.0.0.0:${PORT}`);
  console.log(`   POST /api/assess   — RAG eligibility pipeline`);
  console.log(`   POST /api/index    — seed Supabase (protected)`);
  console.log(`   GET  /api/health   — health check\n`);
});

export default app;
