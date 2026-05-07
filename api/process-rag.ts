import { modelVersions, readEnv } from "./_lib/env.js";
import { chunkText } from "./_lib/chunker.js";
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
import { embedTexts } from "./_lib/openai.js";
import { ProcessRagRequestSchema } from "./_lib/schemas.js";
import { chunksToRecords, getVectorStore } from "./_lib/vector-store.js";

export default async function handler(req: Req, res: Res) {
  if (!methodGuard(req, res, ["POST"])) return;
  const requestId = withRequestId();
  try {
    const body = await readJson(req, ProcessRagRequestSchema);
    const env = readEnv();
    const chunks = await chunkText(body.documentId, body.text, {
      chunkSize: body.chunkSize,
      chunkOverlap: body.chunkOverlap,
    });
    if (chunks.length === 0) {
      return sendError(res, 422, "no_chunks", "Text produced zero chunks");
    }

    let embeddings: number[][];
    if (env.openaiKey) {
      const BATCH = 64;
      embeddings = [];
      for (let i = 0; i < chunks.length; i += BATCH) {
        const slice = chunks.slice(i, i + BATCH).map((c) => c.content);
        const part = await embedTexts(slice);
        embeddings.push(...part);
      }
    } else {
      embeddings = chunks.map((c) => fakeEmbedding(c.content));
    }

    const embedded = chunks.map((c, i) => ({ ...c, embedding: embeddings[i]! }));
    const store = getVectorStore();
    await store.upsert(chunksToRecords(embedded));

    sendJson(res, 200, {
      request_id: requestId,
      model_versions: {
        ...modelVersions(env),
        synthetic_embedding: env.openaiKey ? false : true,
      },
      documentId: body.documentId,
      chunkSize: body.chunkSize ?? 600,
      chunkOverlap: body.chunkOverlap ?? 80,
      embeddingDim: embeddings[0]?.length ?? 0,
      chunks: embedded.map(({ embedding: _, ...rest }) => rest),
      embeddingPoints: projectEmbeddingPoints(embedded),
    });
  } catch (err) {
    if (handleZodError(res, err)) return;
    console.error("[api/process-rag]", err);
    sendError(res, 500, "process_failed", err instanceof Error ? err.message : String(err));
  }
}

function projectEmbeddingPoints(
  embedded: Array<{ id: string; index: number; tokenEstimate: number; embedding: number[] }>,
) {
  const p1 = [11, 53, 97, 173, 251, 307, 401, 509];
  const p2 = [7, 37, 83, 149, 233, 311, 421, 557];
  const raw = embedded.map((e) => {
    const dim = e.embedding.length || 1;
    let x = 0;
    let y = 0;
    for (let i = 0; i < p1.length; i++) x += e.embedding[p1[i]! % dim]!;
    for (let i = 0; i < p2.length; i++) y += e.embedding[p2[i]! % dim]!;
    return {
      id: e.id,
      index: e.index,
      tokenEstimate: e.tokenEstimate,
      x,
      y,
    };
  });

  const minX = Math.min(...raw.map((r) => r.x));
  const maxX = Math.max(...raw.map((r) => r.x));
  const minY = Math.min(...raw.map((r) => r.y));
  const maxY = Math.max(...raw.map((r) => r.y));
  const dx = maxX - minX || 1;
  const dy = maxY - minY || 1;

  return raw.map((r) => ({
    ...r,
    x: (r.x - minX) / dx,
    y: (r.y - minY) / dy,
  }));
}

/**
 * Deterministic 1536-dim "embedding" for offline / no-key dev runs.
 */
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
