import type {
  Chunk,
  ForecastBand,
  ForecastRequest,
  ProcessRagRequest,
  SearchRequest,
} from "../../api/_lib/schemas";

const BASE = "/api";

async function request<T>(path: string, init: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, init);
  const text = await res.text();
  let json: unknown;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    throw new ApiError(res.status, "invalid_response", text || res.statusText);
  }
  if (!res.ok) {
    const e = json as { error?: string; message?: string } | null;
    throw new ApiError(res.status, e?.error ?? "request_failed", e?.message ?? res.statusText);
  }
  return json as T;
}

export class ApiError extends Error {
  constructor(public status: number, public code: string, message: string) {
    super(message);
    this.name = "ApiError";
  }
}

export type ModelVersions = {
  chat: string;
  embedding: string;
  vector_store: "supabase-pgvector" | "in-memory";
  forecast?: string;
  synthetic_embedding?: boolean;
};

export type IngestResponse = {
  request_id: string;
  model_versions: ModelVersions;
  documentId: string;
  kind: "pdf" | "image" | "text";
  filename: string;
  bytes: number;
  tokens: number;
  rawText: string;
};

export async function ingest(file: File, documentId?: string): Promise<IngestResponse> {
  const fd = new FormData();
  fd.append("file", file);
  if (documentId) fd.append("documentId", documentId);
  return request<IngestResponse>("/ingest", { method: "POST", body: fd });
}

export type EmbeddingPoint = {
  id: string;
  index: number;
  tokenEstimate: number;
  x: number;
  y: number;
};

export type ProcessResponse = {
  request_id: string;
  model_versions: ModelVersions & { synthetic_embedding?: boolean };
  documentId: string;
  chunkSize: number;
  chunkOverlap: number;
  embeddingDim: number;
  chunks: Chunk[];
  embeddingPoints: EmbeddingPoint[];
};

export async function processRag(payload: ProcessRagRequest): Promise<ProcessResponse> {
  return request<ProcessResponse>("/process-rag", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(payload),
  });
}

export type SearchHit = {
  id: string;
  index: number;
  similarity: number;
  content: string;
  tokenEstimate: number;
};

export type SearchResponse = {
  request_id: string;
  model_versions: ModelVersions;
  documentId: string;
  query: string;
  results: SearchHit[];
  answer: string | null;
  synthetic_embedding: boolean;
};

export async function search(payload: SearchRequest): Promise<SearchResponse> {
  return request<SearchResponse>("/search", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(payload),
  });
}

export type ForecastResponse = {
  request_id: string;
  model_versions: ModelVersions;
  params: {
    mu: number;
    sigma: number;
    s0: number;
    observations: number;
    paths: number;
    stepsPerMonth: number;
    seed: number | null;
  };
  horizons: Record<string, ForecastBand>;
};

export async function forecast(payload: ForecastRequest): Promise<ForecastResponse> {
  return request<ForecastResponse>("/forecast", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(payload),
  });
}
