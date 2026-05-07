import { describe, expect, it } from "vitest";
import {
  estimateMuSigma,
  forecastGbm,
  logReturns,
  simulateGbm,
  summarizePaths,
} from "../gbm";

describe("logReturns", () => {
  it("computes ln(P_t / P_{t-1})", () => {
    const r = logReturns([100, 101, 102.01]);
    expect(r).toHaveLength(2);
    expect(r[0]).toBeCloseTo(Math.log(101 / 100), 12);
    expect(r[1]).toBeCloseTo(Math.log(102.01 / 101), 12);
  });

  it("skips non-positive entries", () => {
    expect(logReturns([100, 0, 100])).toEqual([]);
  });
});

describe("estimateMuSigma", () => {
  it("matches the spec formulas (sample variance with n-1)", () => {
    const r = [0.01, -0.005, 0.02, -0.015, 0.005];
    const { mu, sigma } = estimateMuSigma(r);
    const expectedMu = r.reduce((a, b) => a + b, 0) / r.length;
    const expectedVar =
      r.reduce((a, x) => a + (x - expectedMu) * (x - expectedMu), 0) / (r.length - 1);
    expect(mu).toBeCloseTo(expectedMu, 12);
    expect(sigma).toBeCloseTo(Math.sqrt(expectedVar), 12);
  });

  it("returns zeros on empty input", () => {
    expect(estimateMuSigma([])).toEqual({ mu: 0, sigma: 0 });
  });
});

describe("simulateGbm + summarizePaths", () => {
  it("is deterministic with a seed", () => {
    const a = simulateGbm({ s0: 100, mu: 0, sigma: 0.01, steps: 20, dt: 1, paths: 50, seed: 7 });
    const b = simulateGbm({ s0: 100, mu: 0, sigma: 0.01, steps: 20, dt: 1, paths: 50, seed: 7 });
    expect(a).toEqual(b);
  });

  it("starts every path at s0", () => {
    const paths = simulateGbm({ s0: 50, mu: 0, sigma: 0.01, steps: 10, dt: 1, paths: 20, seed: 1 });
    for (const p of paths) expect(p[0]).toBe(50);
  });

  it("quantile band ordering p05 <= p50 <= p95", () => {
    const paths = simulateGbm({ s0: 100, mu: 0, sigma: 0.02, steps: 30, dt: 1, paths: 800, seed: 11 });
    const summary = summarizePaths(paths);
    for (const pt of summary) {
      expect(pt.p05).toBeLessThanOrEqual(pt.p50);
      expect(pt.p50).toBeLessThanOrEqual(pt.p95);
    }
  });
});

describe("forecastGbm", () => {
  it("produces n*stepsPerMonth+1 points and meaningful mu/sigma", () => {
    const series = Array.from({ length: 64 }, (_, i) => 100 + Math.sin(i / 4) * 2 + i * 0.05);
    const r = forecastGbm(series, { stepsPerMonth: 21, months: 6, paths: 200, seed: 9 });
    expect(r.points).toHaveLength(21 * 6 + 1);
    expect(Number.isFinite(r.mu)).toBe(true);
    expect(r.sigma).toBeGreaterThan(0);
  });
});
