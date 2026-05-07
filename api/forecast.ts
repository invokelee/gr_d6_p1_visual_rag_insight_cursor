import { modelVersions } from "./_lib/env";
import { forecastGbm, type ForecastPoint } from "./_lib/gbm";
import {
  handleZodError,
  methodGuard,
  readJson,
  sendError,
  sendJson,
  withRequestId,
  type Req,
  type Res,
} from "./_lib/http";
import { ForecastRequestSchema } from "./_lib/schemas";

const MONTHS_BY_HORIZON: Record<"3M" | "6M" | "12M", number> = {
  "3M": 3,
  "6M": 6,
  "12M": 12,
};

export default async function handler(req: Req, res: Res) {
  if (!methodGuard(req, res, ["POST"])) return;
  const requestId = withRequestId();
  try {
    const body = await readJson(req, ForecastRequestSchema);

    const series = body.series.filter((n) => Number.isFinite(n) && n > 0);
    if (series.length < 5) {
      return sendError(
        res,
        422,
        "series_too_short",
        "At least 5 positive numeric observations required",
      );
    }

    const horizonsList = body.horizons ?? ["3M", "6M", "12M"];
    const stepsPerMonth = body.stepsPerMonth ?? 21;
    const paths = body.paths ?? 1000;

    const horizons: Record<string, { steps: number; points: ForecastPoint[] }> = {};
    let mu = 0;
    let sigma = 0;
    for (const h of horizonsList) {
      const months = MONTHS_BY_HORIZON[h];
      const result = forecastGbm(series, {
        stepsPerMonth,
        months,
        paths,
        seed: body.seed,
      });
      mu = result.mu;
      sigma = result.sigma;
      horizons[h] = { steps: months * stepsPerMonth, points: result.points };
    }

    sendJson(res, 200, {
      request_id: requestId,
      model_versions: { ...modelVersions(), forecast: "gbm-mc" },
      params: {
        mu,
        sigma,
        s0: series[series.length - 1]!,
        observations: series.length,
        paths,
        stepsPerMonth,
        seed: body.seed ?? null,
      },
      horizons,
    });
  } catch (err) {
    if (handleZodError(res, err)) return;
    console.error("[api/forecast]", err);
    sendError(res, 500, "forecast_failed", err instanceof Error ? err.message : String(err));
  }
}
