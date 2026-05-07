import { describe, expect, it } from "vitest";
import { cosineSimilarity, topK } from "../similarity";

describe("cosineSimilarity", () => {
  it("returns 1 for identical vectors", () => {
    expect(cosineSimilarity([1, 2, 3], [1, 2, 3])).toBeCloseTo(1, 12);
  });

  it("returns 0 for orthogonal vectors", () => {
    expect(cosineSimilarity([1, 0, 0], [0, 1, 0])).toBeCloseTo(0, 12);
  });

  it("is invariant under positive scalar multiplication", () => {
    const a = cosineSimilarity([1, 2, 3], [2, 4, 6]);
    expect(a).toBeCloseTo(1, 12);
  });

  it("returns -1 for anti-parallel vectors", () => {
    expect(cosineSimilarity([1, 2, 3], [-1, -2, -3])).toBeCloseTo(-1, 12);
  });

  it("returns 0 when one vector is zero", () => {
    expect(cosineSimilarity([0, 0, 0], [1, 2, 3])).toBe(0);
  });

  it("throws on length mismatch", () => {
    expect(() => cosineSimilarity([1, 2], [1, 2, 3])).toThrow(/length mismatch/);
  });
});

describe("topK", () => {
  it("ranks items by cosine similarity descending", () => {
    const query = [1, 0, 0];
    const items = [
      { id: "a", embedding: [0.9, 0.1, 0] },
      { id: "b", embedding: [0, 1, 0] },
      { id: "c", embedding: [0.99, 0.05, 0.05] },
    ];
    const out = topK(query, items, 3);
    expect(out.map((x) => x.id)).toEqual(["c", "a", "b"]);
    expect(out[0]!.similarity).toBeGreaterThan(out[1]!.similarity);
  });

  it("respects k", () => {
    const query = [1, 0];
    const items = [
      { id: "a", embedding: [1, 0] },
      { id: "b", embedding: [0.5, 0.5] },
      { id: "c", embedding: [0, 1] },
    ];
    expect(topK(query, items, 2)).toHaveLength(2);
  });
});
