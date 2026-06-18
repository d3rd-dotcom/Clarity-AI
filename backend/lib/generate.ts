import type { BenefitChunk } from "./retrieve.js";

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

// ─── System prompt ───────────────────────────────────────────────────────────
// CRITICAL: this is the guardrail. Never remove the "never claim final eligibility" instruction.
function buildSystemPrompt(): string {
  return `You are a UK benefits eligibility assistant for Clarity-Eligibility AI.
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
}

function buildUserPrompt(situationText: string, chunks: BenefitChunk[]): string {
  const contextText = chunks
    .map((c) => `[${c.benefit_name} — ${c.chunk_type}]\n${c.content}`)
    .join("\n\n---\n\n");

  return `PERSON'S SITUATION:
${situationText}

RETRIEVED GOV.UK CONTEXT:
${contextText}

Analyse this person's situation against the retrieved context. Return JSON only.`;
}

// ─── OpenAI-compatible fetch helper (both Cerebras and Groq use this format) ──
interface LLMConfig {
  baseUrl: string;
  apiKey: string;
  model: string;
  providerName: string;
}

async function callLLM(
  config: LLMConfig,
  systemPrompt: string,
  userPrompt: string
): Promise<string> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 25000); // 25s timeout

  try {
    const response = await fetch(`${config.baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${config.apiKey}`
      },
      body: JSON.stringify({
        model: config.model,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt }
        ],
        temperature: 0.1,       // Low temperature = consistent, factual output
        max_tokens: 1500,
        response_format: { type: "json_object" }  // Forces JSON output where supported
      }),
      signal: controller.signal
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`${config.providerName} API error ${response.status}: ${errText}`);
    }

    const data = await response.json() as {
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

// ─── Parse and validate LLM JSON output ──────────────────────────────────────
function parseAssessmentJSON(raw: string): AssessmentResult {
  // Strip any accidental markdown code fences
  const cleaned = raw
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/```\s*$/i, "")
    .trim();

  const parsed = JSON.parse(cleaned) as AssessmentResult;

  // Basic structural validation
  if (!Array.isArray(parsed.benefits)) {
    throw new Error("LLM response missing benefits array");
  }

  // Ensure confidence values are valid
  parsed.benefits = parsed.benefits.map((b) => ({
    ...b,
    confidence: (["HIGH", "MEDIUM", "NEEDS_REVIEW"].includes(b.confidence)
      ? b.confidence
      : "NEEDS_REVIEW") as BenefitResult["confidence"]
  }));

  return { ...parsed, data_source: "live_rag" };
}

// ─── Main generate function — Cerebras first, Groq fallback ──────────────────
export async function generateAssessment(
  situationText: string,
  chunks: BenefitChunk[]
): Promise<AssessmentResult> {
  const systemPrompt = buildSystemPrompt();
  const userPrompt = buildUserPrompt(situationText, chunks);

  // ── Primary: Cerebras ─────────────────────────────────────────────────────
  const cerebrasKey = process.env.CEREBRAS_API_KEY;
  if (cerebrasKey) {
    try {
      const raw = await callLLM(
        {
          baseUrl: "https://api.cerebras.ai/v1",
          apiKey: cerebrasKey,
          model: "llama-3.3-70b",
          providerName: "Cerebras"
        },
        systemPrompt,
        userPrompt
      );
      return parseAssessmentJSON(raw);
    } catch (err) {
      console.error("Cerebras failed, trying Groq fallback:", (err as Error).message);
    }
  }

  // ── Fallback: Groq ────────────────────────────────────────────────────────
  const groqKey = process.env.GROQ_API_KEY;
  if (groqKey) {
    try {
      const raw = await callLLM(
        {
          baseUrl: "https://api.groq.com/openai/v1",
          apiKey: groqKey,
          model: "llama-3.3-70b-versatile",
          providerName: "Groq"
        },
        systemPrompt,
        userPrompt
      );
      return parseAssessmentJSON(raw);
    } catch (err) {
      console.error("Groq fallback also failed:", (err as Error).message);
    }
  }

  // ── Both failed — throw so the API route can serve a static fallback ──────
  throw new Error("All LLM providers failed");
}
