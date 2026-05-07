/**
 * Cosine similarity per the spec §4①:
 *   sim(A,B) = (A·B) / (||A|| * ||B||)
 */
export function cosineSimilarity(a: readonly number[], b: readonly number[]): number {
  if (a.length !== b.length) {
    throw new Error(`vector length mismatch: ${a.length} vs ${b.length}`);
  }
  let dot = 0;
  let na = 0;
  let nb = 0;
  for (let i = 0; i < a.length; i++) {
    const x = a[i]!;
    const y = b[i]!;
    dot += x * y;
    na += x * x;
    nb += y * y;
  }
  if (na === 0 || nb === 0) return 0;
  return dot / (Math.sqrt(na) * Math.sqrt(nb));
}

export function topK<T extends { embedding: readonly number[] }>(
  query: readonly number[],
  items: readonly T[],
  k: number,
): Array<T & { similarity: number }> {
  const scored = items.map((item) => ({
    ...item,
    similarity: cosineSimilarity(query, item.embedding),
  }));
  scored.sort((a, b) => b.similarity - a.similarity);
  return scored.slice(0, k);
}
