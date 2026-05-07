import { modelVersions, readEnv } from "./_lib/env.js";
import {
  handleZodError,
  methodGuard,
  readJson,
  sendError,
  sendJson,
  withRequestId,
  type Req,
  type Res,
} from "./_lib/http.js";
import { chatAnswer, embedTexts } from "./_lib/openai.js";
import { SearchRequestSchema } from "./_lib/schemas.js";
import { getVectorStore } from "./_lib/vector-store.js";

export default async function handler(req: Req, res: Res) {
  if (!methodGuard(req, res, ["POST"])) return;
  const requestId = withRequestId();
  try {
    const body = await readJson(req, SearchRequestSchema);
    const env = readEnv();
    const store = getVectorStore();
    const docCount = await store.count(body.documentId);
    if (docCount === 0) {
      return sendError(res, 404, "no_chunks_for_document", `No chunks indexed for documentId=${body.documentId}`);
    }

    const queryEmbedding = env.openaiKey
      ? (await embedTexts([body.query]))[0]!
      : fakeEmbedding(body.query);

    const topK = body.topK ?? 5;
    const generateAnswer = body.generateAnswer ?? true;
    const hits = await store.query({
      documentId: body.documentId,
      embedding: queryEmbedding,
      topK,
    });

    let answer: string | null = null;
    if (generateAnswer && env.openaiKey && hits.length > 0) {
      answer = await chatAnswer({
        question: body.query,
        contextChunks: hits.map((h) => ({
          content: h.content,
          index: h.index,
          similarity: h.similarity,
        })),
      });
    }

    sendJson(res, 200, {
      request_id: requestId,
      model_versions: modelVersions(env),
      documentId: body.documentId,
      query: body.query,
      results: hits.map((h) => ({
        id: h.id,
        index: h.index,
        similarity: Number(h.similarity.toFixed(6)),
        content: h.content,
        tokenEstimate: h.tokenEstimate,
      })),
      answer,
      synthetic_embedding: !env.openaiKey,
    });
  } catch (err) {
    if (handleZodError(res, err)) return;
    console.error("[api/search]", err);
    sendError(res, 500, "search_failed", err instanceof Error ? err.message : String(err));
  }
}

function fakeEmbedding(text: string, dim = 1536): number[] {
  const out = new Float64Array(dim);
  const tokens = text.toLowerCase().match(/[a-z\u00c0-\uffff0-9]+/gi) ?? [];
  for (const tok of tokens) {
    let h = 2166136261 >>> 0;
    for (let i = 0; i < tok.length; i++) {
      h ^= tok.charCodeAt(i);
      h = Math.imul(h, 16777619) >>> 0;
    }
    out[h % dim] += 1;
    out[(h * 2654435761) >>> 0 % dim] -= 0.5;
  }
  let norm = 0;
  for (let i = 0; i < dim; i++) norm += out[i]! * out[i]!;
  norm = Math.sqrt(norm) || 1;
  const arr = new Array(dim);
  for (let i = 0; i < dim; i++) arr[i] = out[i]! / norm;
  return arr;
}
