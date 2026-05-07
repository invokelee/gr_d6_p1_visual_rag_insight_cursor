/**
 * Pull a sequential numeric series out of free text. Used by /api/forecast
 * when the caller has no series in hand and wants the engine to scrape one
 * out of the document the user just RAG-searched.
 *
 * Strategy: scan for tokens that look like positive numbers (allowing comma
 * thousands and decimals), preserve order of appearance, drop NaNs.
 */
export function extractSeriesFromText(text: string, max = 240): number[] {
  const matches = text.match(/-?\d{1,3}(?:[,_]\d{3})+(?:\.\d+)?|-?\d+(?:\.\d+)?/g);
  if (!matches) return [];
  const series: number[] = [];
  for (const raw of matches) {
    const n = Number(raw.replace(/[,_]/g, ""));
    if (!Number.isFinite(n)) continue;
    if (n <= 0) continue;
    series.push(n);
    if (series.length >= max) break;
  }
  return series;
}
