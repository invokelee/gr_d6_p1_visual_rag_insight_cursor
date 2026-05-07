/** Quick client-side token estimate. ~4 chars per token, with bias for whitespace-rich text. */
export function estimateTokensClient(text: string): number {
  if (!text) return 0;
  const chars = text.length;
  const words = text.trim().split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.ceil((chars / 4 + words / 0.75) / 2));
}
