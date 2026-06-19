// === backend/lib/embed.ts ===
import { getCohere } from "./clients.js";

// ─── Embed a single query (user's situation text) ────────────────────────────
// inputType: "search_query" — tells Cohere this is a query, not a passage.
// Must use the same model as embedPassages() so the vector spaces are comparable.
export async function embedQuery(text: string): Promise<number[]> {
  const cohere = getCohere();

  const response = await cohere.embed({
    texts: [text],
    model: "embed-english-v3.0",
    inputType: "search_query",
    embeddingTypes: ["float"],
  });

  // SEC-006: The Cohere SDK changed its response shape between v6 and v7.
  // Rather than `as unknown as X` (which suppresses TypeScript entirely and
  // silently fails when the SDK changes again), we inspect the actual runtime
  // shape and throw a descriptive error if it is unexpected.
  // This ensures a SDK upgrade that breaks the response shape is immediately
  // visible as an error rather than silently triggering the demo fallback.
  const floatEmbeddings = resolveFloatEmbeddings(response.embeddings);

  if (!floatEmbeddings || floatEmbeddings.length === 0) {
    throw new Error("Cohere embedQuery: resolved float embeddings array is empty");
  }

  const first = floatEmbeddings[0];
  if (!first || first.length === 0) {
    throw new Error("Cohere embedQuery: first embedding vector is empty");
  }

  return first;
}

// ─── Embed multiple passages (benefit chunks, used during indexing) ───────────
// inputType: "search_document" — tells Cohere these are documents to be stored.
// Batched at BATCH_SIZE to stay within Cohere free-tier limits.
export async function embedPassages(texts: string[]): Promise<number[][]> {
  if (texts.length === 0) {
    throw new Error("embedPassages called with an empty array");
  }

  const cohere = getCohere();
  const BATCH_SIZE = 90; // Cohere free tier: max 96 texts per call
  const allEmbeddings: number[][] = [];

  for (let i = 0; i < texts.length; i += BATCH_SIZE) {
    const batch = texts.slice(i, i + BATCH_SIZE);

    const response = await cohere.embed({
      texts: batch,
      model: "embed-english-v3.0",
      inputType: "search_document",
      embeddingTypes: ["float"],
    });

    // SEC-006: same defensive shape check for each batch
    const batchEmbeddings = resolveFloatEmbeddings(response.embeddings);

    if (!batchEmbeddings || batchEmbeddings.length === 0) {
      throw new Error(
        `Cohere embedPassages: empty embeddings for batch starting at index ${i}`
      );
    }

    allEmbeddings.push(...batchEmbeddings);
  }

  return allEmbeddings;
}

// ─── Internal: resolve the float embedding array from the SDK response ────────
// The Cohere SDK v7 returns embeddings in one of two shapes depending on the
// embeddingTypes requested and the SDK minor version:
//
//   Shape A (simple array of arrays):  embeddings[0] is number[]
//   Shape B (keyed object):            embeddings.float is number[][]
//
// We check for Shape A first (the documented v7 shape), then fall back to
// Shape B, and throw with the actual response keys if neither matches.
function resolveFloatEmbeddings(
  embeddings: unknown
): number[][] {
  if (Array.isArray(embeddings) && Array.isArray((embeddings as unknown[])[0])) {
    // Shape A
    return embeddings as number[][];
  }

  const raw = embeddings as Record<string, unknown> | null | undefined;
  if (raw && Array.isArray(raw["float"])) {
    // Shape B
    return raw["float"] as number[][];
  }

  const keys = raw ? Object.keys(raw).join(", ") : "none";
  throw new Error(
    `Cohere embed: unexpected response shape. Got keys: [${keys}]. ` +
    "If the Cohere SDK was recently upgraded, check the response structure " +
    "and update resolveFloatEmbeddings() in lib/embed.ts."
  );
}
