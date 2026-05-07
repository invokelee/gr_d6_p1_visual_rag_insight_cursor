import type { ForecastResponse, IngestResponse, ProcessResponse, SearchResponse } from "./api-client";

export type ReportInput = {
  ingest: IngestResponse | null;
  process: ProcessResponse | null;
  search: SearchResponse | null;
  forecast: ForecastResponse | null;
};

function fmt(n: number, digits = 4): string {
  if (!Number.isFinite(n)) return "NaN";
  return n.toFixed(digits);
}

export function buildMarkdown(input: ReportInput): string {
  const date = new Date().toISOString();
  const lines: string[] = [];
  lines.push(`# Visual RAG Insight Report`);
  lines.push(``);
  lines.push(`> Generated: ${date}`);
  lines.push(``);

  if (input.ingest) {
    lines.push(`## 1. Source Document`);
    lines.push(``);
    lines.push(`- **documentId**: \`${input.ingest.documentId}\``);
    lines.push(`- **filename**: ${input.ingest.filename}`);
    lines.push(`- **kind**: ${input.ingest.kind}`);
    lines.push(`- **bytes**: ${input.ingest.bytes.toLocaleString()}`);
    lines.push(`- **tokens (estimated)**: ${input.ingest.tokens.toLocaleString()}`);
    lines.push(``);
  }

  if (input.process) {
    lines.push(`## 2. Chunking & Embedding`);
    lines.push(``);
    lines.push(`- **chunkSize**: ${input.process.chunkSize}, **chunkOverlap**: ${input.process.chunkOverlap}`);
    lines.push(`- **chunks**: ${input.process.chunks.length}`);
    lines.push(`- **embedding model**: ${input.process.model_versions.embedding} (dim=${input.process.embeddingDim})`);
    lines.push(`- **vector store**: ${input.process.model_versions.vector_store}`);
    if (input.process.model_versions.synthetic_embedding) {
      lines.push(`- _Synthetic (no-key) embedding mode is active; semantic quality is degraded._`);
    }
    lines.push(``);
  }

  if (input.search) {
    lines.push(`## 3. Retrieval`);
    lines.push(``);
    lines.push(`**Query**: ${input.search.query}`);
    lines.push(``);
    lines.push(`| # | similarity | tokens | preview |`);
    lines.push(`|---|---|---|---|`);
    for (const r of input.search.results) {
      const preview = r.content.replace(/\s+/g, " ").slice(0, 110);
      lines.push(`| ${r.index} | ${fmt(r.similarity, 4)} | ${r.tokenEstimate} | ${escapeMd(preview)} |`);
    }
    lines.push(``);
    if (input.search.answer) {
      lines.push(`### Answer`);
      lines.push(``);
      lines.push(input.search.answer);
      lines.push(``);
    }
  }

  if (input.forecast) {
    lines.push(`## 4. GBM Forecast`);
    lines.push(``);
    const { mu, sigma, s0, observations, paths, stepsPerMonth } = input.forecast.params;
    lines.push(`- **mu (log-return mean)**: ${fmt(mu, 6)}`);
    lines.push(`- **sigma (log-return stdev)**: ${fmt(sigma, 6)}`);
    lines.push(`- **S0**: ${fmt(s0, 4)}`);
    lines.push(`- **observations**: ${observations}, **paths**: ${paths}, **stepsPerMonth**: ${stepsPerMonth}`);
    lines.push(``);
    lines.push(`| horizon | steps | terminal mean | p05 | p50 | p95 |`);
    lines.push(`|---|---|---|---|---|---|`);
    for (const [h, band] of Object.entries(input.forecast.horizons)) {
      const last = band.points[band.points.length - 1];
      if (!last) continue;
      lines.push(
        `| ${h} | ${band.steps} | ${fmt(last.mean, 4)} | ${fmt(last.p05, 4)} | ${fmt(last.p50, 4)} | ${fmt(last.p95, 4)} |`,
      );
    }
    lines.push(``);
  }

  lines.push(`---`);
  lines.push(``);
  lines.push(
    `_Disclaimer: GBM is a stochastic toy model for educational visualization. The bands are not investment advice._`,
  );
  return lines.join("\n");
}

function escapeMd(s: string): string {
  return s.replace(/\|/g, "\\|").replace(/\n/g, " ");
}
