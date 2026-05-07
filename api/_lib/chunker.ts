import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters";
import type { Chunk } from "./schemas.js";

export type ChunkerOptions = {
  chunkSize?: number;
  chunkOverlap?: number;
};

/** Approximate token count: 4 chars ≈ 1 token (heuristic, no tokenizer dep). */
export function estimateTokens(text: string): number {
  if (!text) return 0;
  return Math.max(1, Math.ceil(text.length / 4));
}

export async function chunkText(
  documentId: string,
  text: string,
  options: ChunkerOptions = {},
): Promise<Chunk[]> {
  const chunkSize = options.chunkSize ?? 600;
  const chunkOverlap = options.chunkOverlap ?? 80;

  const splitter = new RecursiveCharacterTextSplitter({
    chunkSize,
    chunkOverlap,
    separators: ["\n\n", "\n", ". ", "? ", "! ", " ", ""],
  });
  const pieces = await splitter.splitText(text);
  return pieces.map((content, index) => ({
    id: `${documentId}:${index}`,
    documentId,
    index,
    content: content.trim(),
    tokenEstimate: estimateTokens(content),
  }));
}
