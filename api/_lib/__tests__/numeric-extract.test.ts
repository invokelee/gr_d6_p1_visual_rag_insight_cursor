import { describe, expect, it } from "vitest";
import { extractSeriesFromText } from "../numeric-extract";

describe("extractSeriesFromText", () => {
  it("extracts ordered positive numbers", () => {
    const text = "Revenue grew from 1,200 to 1,300 then 1450.5.";
    expect(extractSeriesFromText(text)).toEqual([1200, 1300, 1450.5]);
  });

  it("captures incidental digits inside identifiers (documented behavior)", () => {
    const text = "Q3 closed at 1450.5";
    expect(extractSeriesFromText(text)).toEqual([3, 1450.5]);
  });

  it("returns empty for text without numbers", () => {
    expect(extractSeriesFromText("hello world")).toEqual([]);
  });

  it("respects max", () => {
    const text = Array.from({ length: 500 }, (_, i) => i + 1).join(" ");
    const out = extractSeriesFromText(text, 10);
    expect(out).toHaveLength(10);
    expect(out[0]).toBe(1);
  });
});
