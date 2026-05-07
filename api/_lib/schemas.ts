import { z } from "zod";

export const ChunkSchema = z.object({
  id: z.string(),
  documentId: z.string(),
  index: z.number().int().nonnegative(),
  content: z.string(),
  tokenEstimate: z.number().int().nonnegative(),
});
export type Chunk = z.infer<typeof ChunkSchema>;

export const EmbeddingChunkSchema = ChunkSchema.extend({
  embedding: z.array(z.number()),
});
export type EmbeddingChunk = z.infer<typeof EmbeddingChunkSchema>;

export const ProcessRagRequestSchema = z.object({
  documentId: z.string().min(1),
  text: z.string().min(1),
  chunkSize: z.number().int().positive().max(4000).optional(),
  chunkOverlap: z.number().int().nonnegative().max(1000).optional(),
});
export type ProcessRagRequest = z.infer<typeof ProcessRagRequestSchema>;

export const SearchRequestSchema = z.object({
  documentId: z.string().min(1),
  query: z.string().min(1),
  sourceText: z.string().min(1).optional(),
  topK: z.number().int().positive().max(20).default(5),
  generateAnswer: z.boolean().default(true),
});
export type SearchRequest = z.infer<typeof SearchRequestSchema>;

export const ForecastRequestSchema = z.object({
  series: z.array(z.number().finite()).min(5),
  horizons: z.array(z.enum(["3M", "6M", "12M"])).default(["3M", "6M", "12M"]),
  paths: z.number().int().positive().max(5000).default(1000),
  stepsPerMonth: z.number().int().positive().max(60).default(21),
  seed: z.number().int().optional(),
});
export type ForecastRequest = z.infer<typeof ForecastRequestSchema>;

export const ForecastBandSchema = z.object({
  horizon: z.enum(["3M", "6M", "12M"]),
  steps: z.number().int().nonnegative(),
  points: z.array(
    z.object({
      step: z.number().int().nonnegative(),
      mean: z.number(),
      p05: z.number(),
      p50: z.number(),
      p95: z.number(),
    }),
  ),
});
export type ForecastBand = z.infer<typeof ForecastBandSchema>;
