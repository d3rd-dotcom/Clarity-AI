import { CohereClient } from "cohere-ai";

// ─── Lazy init — fail at call time with a clear message, not at startup ──────
let _cohere: CohereClient | null = null;

function getCohere(): CohereClient {
  if (!_cohere) {
    const key = process.env.COHERE_API_KEY;
    if (!key) {
      throw new Error("COHERE_API_KEY is not set in environment variables");
    }
    _cohere = new CohereClient({ token: key });
  }
  return _cohere;
}

// ─── Embed a single query (user's situation text) ────────────────────────────
// input_type: "search_query" — tells Cohere this is a query, not a passage
export async function embedQuery(text: string): Promise<number[]> {
  const cohere = getCohere();

  const response = await cohere.embed({
    texts: [text],
    model: "embed-english-v3.0",
    inputType: "search_query",
    embeddingTypes: ["float"]
  });

  // ⚠️ Flag: Cohere v7 SDK returns embeddings under response.embeddings.float
  const embeddings = response.embeddings;
  if (!embeddings || !Array.isArray(embeddings)) {
    throw new Error("Cohere embed returned no embeddings for query");
  }

  // Handle both float array format and nested float format
  const firstEmbedding = Array.isArray(embeddings[0])
    ? (embeddings[0] as number[])
    : (embeddings as unknown as number[][])[0];

  if (!firstEmbedding || firstEmbedding.length === 0) {
    throw new Error("Cohere returned an empty embedding vector");
  }

  return firstEmbedding;
}

// ─── Embed multiple passages (benefit chunks, used during indexing) ───────────
// input_type: "search_document" — tells Cohere these are documents
export async function embedPassages(texts: string[]): Promise<number[][]> {
  if (texts.length === 0) throw new Error("embedPassages called with empty array");

  const cohere = getCohere();

  // Cohere free tier supports batches — keep under 96 texts per call
  const BATCH_SIZE = 90;
  const allEmbeddings: number[][] = [];

  for (let i = 0; i < texts.length; i += BATCH_SIZE) {
    const batch = texts.slice(i, i + BATCH_SIZE);

    const response = await cohere.embed({
      texts: batch,
      model: "embed-english-v3.0",
      inputType: "search_document",
      embeddingTypes: ["float"]
    });

    const embeddings = response.embeddings;
    if (!embeddings || !Array.isArray(embeddings)) {
      throw new Error(`Cohere embed returned no embeddings for batch starting at index ${i}`);
    }

    // Handle SDK response shape
    const embeddingArrays = Array.isArray(embeddings[0])
      ? (embeddings as number[][])
      : (embeddings as unknown as { float: number[][] }).float;

    allEmbeddings.push(...embeddingArrays);
  }

  return allEmbeddings;
}
