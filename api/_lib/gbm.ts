/**
 * Geometric Brownian Motion forecast engine (spec §4②).
 *
 *   r_t = ln(P_t / P_{t-1})
 *   mu_hat  = mean(r_t)
 *   sig_hat = stdev(r_t)
 *   S_{t+n} = S_t * exp((mu - sigma^2/2) * dt + sigma * sqrt(dt) * Z)
 *
 * Confidence band = path quantiles (5/50/95) over `paths` Monte Carlo samples.
 */

export type GbmParams = {
  s0: number;
  mu: number;
  sigma: number;
  steps: number;
  dt: number;
  paths: number;
  seed?: number;
};

export type ForecastPoint = {
  step: number;
  mean: number;
  p05: number;
  p50: number;
  p95: number;
};

export function logReturns(series: readonly number[]): number[] {
  const out: number[] = [];
  for (let i = 1; i < series.length; i++) {
    const prev = series[i - 1]!;
    const cur = series[i]!;
    if (prev <= 0 || cur <= 0) continue;
    out.push(Math.log(cur / prev));
  }
  return out;
}

export function estimateMuSigma(returns: readonly number[]): { mu: number; sigma: number } {
  if (returns.length === 0) return { mu: 0, sigma: 0 };
  const mu = returns.reduce((a, b) => a + b, 0) / returns.length;
  if (returns.length < 2) return { mu, sigma: 0 };
  const variance =
    returns.reduce((acc, r) => acc + (r - mu) * (r - mu), 0) / (returns.length - 1);
  return { mu, sigma: Math.sqrt(variance) };
}

/** Mulberry32 deterministic PRNG. */
function mulberry32(seed: number): () => number {
  let t = seed >>> 0;
  return () => {
    t = (t + 0x6d2b79f5) >>> 0;
    let r = t;
    r = Math.imul(r ^ (r >>> 15), r | 1);
    r ^= r + Math.imul(r ^ (r >>> 7), r | 61);
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

function boxMuller(rand: () => number): number {
  let u1 = 0;
  let u2 = 0;
  while (u1 === 0) u1 = rand();
  while (u2 === 0) u2 = rand();
  return Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
}

export function simulateGbm(params: GbmParams): number[][] {
  const { s0, mu, sigma, steps, dt, paths, seed } = params;
  const rand = seed === undefined ? Math.random : mulberry32(seed);
  const drift = (mu - 0.5 * sigma * sigma) * dt;
  const diff = sigma * Math.sqrt(dt);
  const out: number[][] = [];
  for (let p = 0; p < paths; p++) {
    const path: number[] = new Array(steps + 1);
    path[0] = s0;
    let s = s0;
    for (let t = 1; t <= steps; t++) {
      const z = boxMuller(rand);
      s = s * Math.exp(drift + diff * z);
      path[t] = s;
    }
    out.push(path);
  }
  return out;
}

function quantile(sorted: readonly number[], q: number): number {
  if (sorted.length === 0) return Number.NaN;
  const pos = (sorted.length - 1) * q;
  const lo = Math.floor(pos);
  const hi = Math.ceil(pos);
  if (lo === hi) return sorted[lo]!;
  const w = pos - lo;
  return sorted[lo]! * (1 - w) + sorted[hi]! * w;
}

export function summarizePaths(paths: readonly number[][]): ForecastPoint[] {
  if (paths.length === 0) return [];
  const steps = paths[0]!.length;
  const out: ForecastPoint[] = new Array(steps);
  for (let t = 0; t < steps; t++) {
    const col: number[] = new Array(paths.length);
    for (let p = 0; p < paths.length; p++) col[p] = paths[p]![t]!;
    col.sort((a, b) => a - b);
    const mean = col.reduce((a, b) => a + b, 0) / col.length;
    out[t] = {
      step: t,
      mean,
      p05: quantile(col, 0.05),
      p50: quantile(col, 0.5),
      p95: quantile(col, 0.95),
    };
  }
  return out;
}

export function forecastGbm(
  series: readonly number[],
  opts: { stepsPerMonth: number; months: number; paths: number; seed?: number },
): { points: ForecastPoint[]; mu: number; sigma: number } {
  const returns = logReturns(series);
  const { mu, sigma } = estimateMuSigma(returns);
  const s0 = series[series.length - 1] ?? 1;
  const paths = simulateGbm({
    s0,
    mu,
    sigma,
    steps: opts.stepsPerMonth * opts.months,
    dt: 1,
    paths: opts.paths,
    seed: opts.seed,
  });
  return { points: summarizePaths(paths), mu, sigma };
}
