// === backend/lib/generate.ts ===
import { z } from "zod";
import type { BenefitChunk } from "./retrieve.js";

// ─── Named constants (CQ-003) ─────────────────────────────────────────────────
// Previously these values were inline magic numbers with no explanation.
// Named constants make their purpose clear and allow environment-level overrides.

/** Milliseconds before an in-flight LLM request is aborted.
 *  Generous to accommodate cold starts on Cerebras free tier. */
const LLM_REQUEST_TIMEOUT_MS = parseInt(
  process.env.LLM_TIMEOUT_MS ?? "25000",
  10
);

/** Temperature of 0.1 = highly deterministic output.
 *  We need consistent JSON structure, not creative variation. */
const LLM_TEMPERATURE = 0.1;

/**
 * Token budget for the full benefit assessment JSON.
 * 7 benefits x ~150 tokens each + JSON scaffolding ~ 1,200 tokens.
 * 1,500 provides comfortable headroom without runaway cost.
 */
const LLM_MAX_TOKENS = parseInt(process.env.LLM_MAX_TOKENS ?? "1500", 10);

// ─── Output types ────────────────────────────────────────────────────────────
export interface BenefitResult {
  name: string;
  confidence: "HIGH" | "MEDIUM" | "NEEDS_REVIEW";
  reason: string;
  weekly_estimate: number | null;
  monthly_estimate: number | null;
  claim_url: string;
  gov_rule_reference: string;
}

export interface AssessmentResult {
  benefits: BenefitResult[];
  total_weekly_estimate: number;
  total_monthly_estimate: number;
  disclaimer: string;
  data_source: "live_rag" | "fallback";
}

// ─── Zod output validation schemas (CQ-005) ──────────────────────────────────
// The LLM is prompted to return JSON, but we cannot trust it to be correct.
// Previously only `benefits` being an array was checked, meaning malformed
// fields (undefined name, string instead of number for estimates, missing
// total_monthly_estimate) could reach the frontend and throw at render time.
//
// These schemas validate every field. A ZodError is caught by the caller
// in generateAssessment() and triggers the demo fallback — the same path
// a network timeout would take. Judges never see a broken results page.

// AUDIT FOLLOW-UP (post-review): claim_url originally used z.string().url(),
// which is too strict — real LLM output occasionally returns a URL missing
// the https:// scheme (e.g. "gov.uk/apply-universal-credit" instead of
// "https://gov.uk/apply-universal-credit"). Under the original strict schema,
// ANY single malformed URL across the 7 possible benefits discarded the
// ENTIRE response and forced the static fallback — even when 6 of 7 benefits
// validated fine. That defeats the purpose of having a live RAG pipeline at
// all. Fixed: claim_url now coerces a bare gov.uk-style URL to https:// via
// a preprocessing transform, and only fails validation if it still isn't a
// usable URL after that correction.
const claimUrlSchema = z
  .string()
  .min(1)
  .transform((val) => (/^https?:\/\//i.test(val) ? val : `https://${val}`))
  .pipe(z.string().url())
  .refine(
    (url) => {
      try {
        const parsed = new URL(url);
        // Must have a reasonable hostname (contain a dot or be localhost)
        return parsed.hostname.includes('.') || parsed.hostname === 'localhost';
      } catch {
        return false;
      }
    },
    { message: 'URL must have a valid domain name' }
  );

const BenefitResultSchema = z.object({
  name:               z.string().min(1),
  // .default() means a missing or invalid confidence value becomes NEEDS_REVIEW
  // rather than crashing, matching the previous manual normalisation logic.
  confidence:         z
    .enum(["HIGH", "MEDIUM", "NEEDS_REVIEW"])
    .default("NEEDS_REVIEW"),
  reason:             z.string().min(1),
  weekly_estimate:    z.number().nonnegative().nullable(),
  monthly_estimate:   z.number().nonnegative().nullable(),
  claim_url:          claimUrlSchema,
  gov_rule_reference: z.string().min(1),
});

const AssessmentOutputSchema = z.object({
  benefits:               z.array(BenefitResultSchema).min(0),
  total_weekly_estimate:  z.number().nonnegative(),
  total_monthly_estimate: z.number().nonnegative(),
  disclaimer:             z.string().min(1),
});

// ─── System prompt — module-level constant (CQ-007) ──────────────────────────
// Previously built inside generateAssessment() on every request, making it
// look like a dynamic value when it is completely static. Hoisted here so it
// is easy to audit, version, and test independently from the calling code.
//
// CRITICAL GUARDRAIL: Never remove the "never claim final eligibility"
// instruction. The frontend renders whatever the LLM returns — if this
// guardrail is removed, the system could tell users they ARE approved.
const SYSTEM_PROMPT = `You are a UK benefits eligibility assistant for Clarity-Eligibility AI.
Your job is to analyse a person's situation against retrieved GOV.UK benefit rules and identify which benefits they may qualify for.

STRICT RULES:
1. Only assess benefits that are present in the retrieved context. Do not invent benefits.
2. Never claim the person definitely qualifies. Use "may qualify" language always.
3. Assign confidence levels: HIGH (clearly meets all main criteria), MEDIUM (meets some but missing info), NEEDS_REVIEW (complex situation, unclear from context).
4. Estimate weekly and monthly amounts based only on figures in the retrieved context. If you cannot estimate, set to null.
5. Every result must include the specific GOV.UK rule that triggered the match.
6. Return ONLY valid JSON. No preamble, no explanation, no markdown, no code fences. Just the JSON object.

OUTPUT FORMAT (return exactly this structure):
{
  "benefits": [
    {
      "name": "benefit name",
      "confidence": "HIGH" | "MEDIUM" | "NEEDS_REVIEW",
      "reason": "plain English explanation of why they may qualify",
      "weekly_estimate": number or null,
      "monthly_estimate": number or null,
      "claim_url": "https://www.gov.uk/...",
      "gov_rule_reference": "The specific rule from GOV.UK context that triggered this match"
    }
  ],
  "total_weekly_estimate": number,
  "total_monthly_estimate": number,
  "disclaimer": "These are estimates only. Actual amounts depend on your specific circumstances. Always verify eligibility at GOV.UK or with an advisor before making financial decisions."
}`;

// ─── User prompt builder ──────────────────────────────────────────────────────
// This IS dynamic (depends on the user's situation and retrieved chunks)
// so it remains a function rather than a constant.
function buildUserPrompt(
  situationText: string,
  chunks: BenefitChunk[]
): string {
  const contextText = chunks
    .map((c) => `[${c.benefit_name} — ${c.chunk_type}]\n${c.content}`)
    .join("\n\n---\n\n");

  return `PERSON'S SITUATION:
${situationText}

RETRIEVED GOV.UK CONTEXT:
${contextText}

Analyse this person's situation against the retrieved context. Return JSON only.`;
}

// ─── OpenAI-compatible fetch helper ──────────────────────────────────────────
// Both Cerebras and Groq expose an OpenAI-compatible /chat/completions
// endpoint, so a single helper covers both providers.
interface LLMConfig {
  baseUrl:      string;
  apiKey:       string;
  model:        string;
  providerName: string;
}

async function callLLM(
  config:       LLMConfig,
  systemPrompt: string,
  userPrompt:   string
): Promise<string> {
  const controller = new AbortController();
  // CQ-003: named constant instead of the previous magic number 25000
  const timeout = setTimeout(
    () => controller.abort(),
    LLM_REQUEST_TIMEOUT_MS
  );

  try {
    const response = await fetch(`${config.baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization:  `Bearer ${config.apiKey}`,
      },
      body: JSON.stringify({
        model:    config.model,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user",   content: userPrompt },
        ],
        // CQ-003: named constants replace the previous inline magic numbers
        temperature:     LLM_TEMPERATURE,
        max_tokens:      LLM_MAX_TOKENS,
        response_format: { type: "json_object" }, // forces JSON where supported
      }),
      signal: controller.signal,
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(
        `${config.providerName} API error ${response.status}: ${errText}`
      );
    }

    const data = (await response.json()) as {
      choices: Array<{ message: { content: string } }>;
    };

    const content = data?.choices?.[0]?.message?.content;
    if (!content) {
      throw new Error(`${config.providerName} returned empty content`);
    }

    return content;
  } finally {
    clearTimeout(timeout);
  }
}

// ─── Parse and validate LLM JSON output (CQ-005) ─────────────────────────────
// Uses Zod for full structural validation. A SyntaxError (invalid JSON) or
// ZodError (wrong shape / types) both propagate to generateAssessment(),
// where they are caught and trigger the demo fallback.
export function parseAssessmentJSON(raw: string): AssessmentResult {
  // Strip any accidental markdown fences the LLM may have added
  const cleaned = raw
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i,     "")
    .replace(/```\s*$/i,     "")
    .trim();

  // Step 1: JSON parse — throws SyntaxError on malformed output
  const parsed: unknown = JSON.parse(cleaned);

  // Step 2: Schema validation — throws ZodError on wrong types or missing fields
  const validated = AssessmentOutputSchema.parse(parsed);

  return { ...validated, data_source: "live_rag" };
}

// ─── Main export: Cerebras primary, Groq fallback ────────────────────────────
export async function generateAssessment(
  situationText: string,
  chunks:        BenefitChunk[]
): Promise<AssessmentResult> {
  // CQ-007: SYSTEM_PROMPT is the module-level constant — not rebuilt per call
  const userPrompt = buildUserPrompt(situationText, chunks);

  // ── Primary: Cerebras ─────────────────────────────────────────────────────
  const cerebrasKey = process.env.CEREBRAS_API_KEY;
  if (cerebrasKey) {
    try {
      const raw = await callLLM(
        {
          baseUrl:      "https://api.cerebras.ai/v1",
          apiKey:       cerebrasKey,
          model:        "gpt-oss-120b",
          providerName: "Cerebras",
        },
        SYSTEM_PROMPT,
        userPrompt
      );
      return parseAssessmentJSON(raw);
    } catch (err) {
      console.error(
        "Cerebras failed, trying Groq fallback:",
        (err as Error).message
      );
    }
  }

  // ── Fallback: Groq via raw REST (no groq-sdk dependency needed) ──────────
  // Both providers use the OpenAI-compatible /chat/completions API, so the
  // same callLLM() helper works for both. DEP-001/CQ-002: groq-sdk removed.
  const groqKey = process.env.GROQ_API_KEY;
  if (groqKey) {
    try {
      const raw = await callLLM(
        {
          baseUrl:      "https://api.groq.com/openai/v1",
          apiKey:       groqKey,
          model:        "llama-3.3-70b-versatile",
          providerName: "Groq",
        },
        SYSTEM_PROMPT,
        userPrompt
      );
      return parseAssessmentJSON(raw);
    } catch (err) {
      console.error(
        "Groq fallback also failed:",
        (err as Error).message
      );
    }
  }

  // ── Both providers failed — throw so assess.ts can serve static fallback ──
  throw new Error("All LLM providers failed");
}
