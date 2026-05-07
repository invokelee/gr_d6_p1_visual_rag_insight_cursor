import { create } from "zustand";
import type {
  ForecastResponse,
  IngestResponse,
  ProcessResponse,
  SearchResponse,
} from "@/lib/api-client";

export type Stage =
  | "idle"
  | "uploading"
  | "ingested"
  | "processing"
  | "indexed"
  | "searching"
  | "searched"
  | "forecasting"
  | "forecasted";

const STAGE_ORDER: Stage[] = [
  "idle",
  "uploading",
  "ingested",
  "processing",
  "indexed",
  "searching",
  "searched",
  "forecasting",
  "forecasted",
];

export function stageIndex(s: Stage): number {
  return STAGE_ORDER.indexOf(s);
}

export type RAGState = {
  stage: Stage;
  error: string | null;
  ingest: IngestResponse | null;
  process: ProcessResponse | null;
  search: SearchResponse | null;
  forecast: ForecastResponse | null;
  selectedChunkId: string | null;

  setStage: (s: Stage) => void;
  setError: (e: string | null) => void;
  setIngest: (r: IngestResponse | null) => void;
  setProcess: (r: ProcessResponse | null) => void;
  setSearch: (r: SearchResponse | null) => void;
  setForecast: (r: ForecastResponse | null) => void;
  selectChunk: (id: string | null) => void;
  reset: () => void;
};

export const useRAGStore = create<RAGState>((set) => ({
  stage: "idle",
  error: null,
  ingest: null,
  process: null,
  search: null,
  forecast: null,
  selectedChunkId: null,

  setStage: (stage) => set({ stage }),
  setError: (error) => set({ error }),
  setIngest: (ingest) =>
    set({
      ingest,
      process: null,
      search: null,
      forecast: null,
      selectedChunkId: null,
      stage: ingest ? "ingested" : "idle",
    }),
  setProcess: (process) =>
    set({
      process,
      search: null,
      forecast: null,
      selectedChunkId: null,
      stage: process ? "indexed" : "ingested",
    }),
  setSearch: (search) => set({ search, stage: search ? "searched" : "indexed" }),
  setForecast: (forecast) =>
    set({ forecast, stage: forecast ? "forecasted" : "searched" }),
  selectChunk: (selectedChunkId) => set({ selectedChunkId }),
  reset: () =>
    set({
      stage: "idle",
      error: null,
      ingest: null,
      process: null,
      search: null,
      forecast: null,
      selectedChunkId: null,
    }),
}));
