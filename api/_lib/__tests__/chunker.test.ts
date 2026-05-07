import { describe, expect, it } from "vitest";
import { chunkText, estimateTokens } from "../chunker";

const PARAGRAPH = `Vercel Serverless Functions enable backend logic without managing servers. ` +
  `Each /api file becomes an HTTP endpoint. Cold starts are minimized via lightweight runtimes. `;

const LONG_TEXT = Array.from({ length: 30 }, () => PARAGRAPH).join("\n\n");

describe("chunkText", () => {
  it("returns at least one chunk for non-empty input", async () => {
    const chunks = await chunkText("doc1", LONG_TEXT, { chunkSize: 400, chunkOverlap: 40 });
    expect(chunks.length).toBeGreaterThan(0);
    expect(chunks[0]!.documentId).toBe("doc1");
    expect(chunks[0]!.id).toBe("doc1:0");
  });

  it("respects chunkSize approximately (allows some variance for separator alignment)", async () => {
    const chunks = await chunkText("doc2", LONG_TEXT, { chunkSize: 400, chunkOverlap: 40 });
    for (const c of chunks) {
      expect(c.content.length).toBeLessThanOrEqual(400 + 200);
    }
  });

  it("returns sequential indices", async () => {
    const chunks = await chunkText("doc3", LONG_TEXT, { chunkSize: 300, chunkOverlap: 30 });
    chunks.forEach((c, i) => expect(c.index).toBe(i));
  });

  it("handles short text as a single chunk", async () => {
    const chunks = await chunkText("doc4", "Hello world", { chunkSize: 600, chunkOverlap: 80 });
    expect(chunks).toHaveLength(1);
    expect(chunks[0]!.content).toContain("Hello world");
  });
});

describe("estimateTokens", () => {
  it("scales linearly with length", () => {
    expect(estimateTokens("")).toBe(0);
    const a = estimateTokens("a".repeat(100));
    const b = estimateTokens("a".repeat(400));
    expect(b).toBeGreaterThan(a);
    expect(b).toBeLessThan(a * 5);
  });
});
