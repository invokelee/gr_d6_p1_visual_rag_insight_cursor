import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { readEnv } from "./env.js";
import type { EmbeddingChunk } from "./schemas.js";
import { topK as cosineTopK } from "./similarity.js";

export type VectorRecord = {
  id: string;
  documentId: string;
  index: number;
  content: string;
  tokenEstimate: number;
  embedding: number[];
};

export type QueryHit = VectorRecord & { similarity: number };

export interface VectorStore {
  readonly kind: "supabase" | "memory";
  upsert(records: VectorRecord[]): Promise<void>;
  query(opts: { documentId: string; embedding: number[]; topK: number }): Promise<QueryHit[]>;
  count(documentId: string): Promise<number>;
}

class InMemoryStore implements VectorStore {
  readonly kind = "memory" as const;
  private readonly byDoc = new Map<string, Map<string, VectorRecord>>();

  async upsert(records: VectorRecord[]): Promise<void> {
    for (const r of records) {
      let bucket = this.byDoc.get(r.documentId);
      if (!bucket) {
        bucket = new Map();
        this.byDoc.set(r.documentId, bucket);
      }
      bucket.set(r.id, r);
    }
  }

  async query(opts: { documentId: string; embedding: number[]; topK: number }): Promise<QueryHit[]> {
    const bucket = this.byDoc.get(opts.documentId);
    if (!bucket) return [];
    const items = Array.from(bucket.values());
    return cosineTopK(opts.embedding, items, opts.topK);
  }

  async count(documentId: string): Promise<number> {
    return this.byDoc.get(documentId)?.size ?? 0;
  }
}

class SupabaseStore implements VectorStore {
  readonly kind = "supabase" as const;
  constructor(private readonly client: SupabaseClient) {}

  async upsert(records: VectorRecord[]): Promise<void> {
    const rows = records.map((r) => ({
      id: r.id,
      document_id: r.documentId,
      chunk_index: r.index,
      content: r.content,
      token_estimate: r.tokenEstimate,
      embedding: r.embedding,
    }));
    const { error } = await this.client.from("rag_chunks").upsert(rows);
    if (error) throw error;
  }

  async query(opts: { documentId: string; embedding: number[]; topK: number }): Promise<QueryHit[]> {
    const { data, error } = await this.client.rpc("rag_match_chunks", {
      query_embedding: opts.embedding,
      match_count: opts.topK,
      filter_document_id: opts.documentId,
    });
    if (error) throw error;
    return (data as Array<Record<string, unknown>>).map((row) => ({
      id: row.id as string,
      documentId: row.document_id as string,
      index: row.chunk_index as number,
      content: row.content as string,
      tokenEstimate: row.token_estimate as number,
      embedding: [],
      similarity: row.similarity as number,
    }));
  }

  async count(documentId: string): Promise<number> {
    const { count, error } = await this.client
      .from("rag_chunks")
      .select("id", { count: "exact", head: true })
      .eq("document_id", documentId);
    if (error) throw error;
    return count ?? 0;
  }
}

let cachedStore: VectorStore | null = null;

export function getVectorStore(): VectorStore {
  if (cachedStore) return cachedStore;
  const env = readEnv();
  if (env.supabaseUrl && env.supabaseServiceKey) {
    const client = createClient(env.supabaseUrl, env.supabaseServiceKey, {
      auth: { persistSession: false },
    });
    cachedStore = new SupabaseStore(client);
  } else {
    cachedStore = new InMemoryStore();
  }
  return cachedStore;
}

/** Test helper to reset module-level cache. */
export function __resetVectorStoreForTests() {
  cachedStore = null;
}

export function chunksToRecords(chunks: EmbeddingChunk[]): VectorRecord[] {
  return chunks.map((c) => ({
    id: c.id,
    documentId: c.documentId,
    index: c.index,
    content: c.content,
    tokenEstimate: c.tokenEstimate,
    embedding: c.embedding,
  }));
}
