import { useMemo, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import {
  Area,
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { LineChart as LineChartIcon, Loader2, TrendingUp } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { forecast, ApiError } from "@/lib/api-client";
import { useRAGStore } from "@/stores/useRAGStore";
import { cn } from "@/lib/cn";

const HORIZONS = ["3M", "6M", "12M"] as const;
type Horizon = (typeof HORIZONS)[number];

export function ForecastChart() {
  const ingestState = useRAGStore((s) => s.ingest);
  const forecastState = useRAGStore((s) => s.forecast);
  const setForecast = useRAGStore((s) => s.setForecast);
  const setStage = useRAGStore((s) => s.setStage);
  const setError = useRAGStore((s) => s.setError);

  const [horizon, setHorizon] = useState<Horizon>("6M");
  const [seriesText, setSeriesText] = useState<string>(() => suggestedSeries(ingestState?.rawText ?? ""));

  const series = useMemo(() => parseSeries(seriesText), [seriesText]);

  const mutation = useMutation({
    mutationFn: async () => {
      setStage("forecasting");
      setError(null);
      return forecast({
        series,
        horizons: [...HORIZONS],
        paths: 1000,
        stepsPerMonth: 21,
        seed: 42,
      });
    },
    onSuccess: (r) => setForecast(r),
    onError: (err) => {
      const msg = err instanceof ApiError ? `${err.code}: ${err.message}` : String(err);
      setError(msg);
      setStage("searched");
    },
  });

  const data = useMemo(() => {
    if (!forecastState) return [];
    const band = forecastState.horizons[horizon];
    if (!band) return [];
    return band.points.map((p) => ({
      step: p.step,
      mean: p.mean,
      p50: p.p50,
      band: [p.p05, p.p95] as [number, number],
    }));
  }, [forecastState, horizon]);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TrendingUp className="h-4 w-4" /> 4. GBM Forecast
        </CardTitle>
        <CardDescription>
          GBM Monte Carlo (1000 paths, 21 steps/month). Shaded band = 5–95% quantile.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div>
          <label className="mb-1 block text-xs text-muted-foreground">
            Numeric series (comma- or whitespace-separated; positive only)
          </label>
          <Textarea
            value={seriesText}
            onChange={(e) => setSeriesText(e.target.value)}
            rows={3}
            placeholder="100, 101.2, 102.0, 99.8, 103.4, …"
          />
          <div className="mt-1 text-[11px] text-muted-foreground">
            Parsed: {series.length} observations · S0 = {series[series.length - 1]?.toFixed(2) ?? "—"}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {HORIZONS.map((h) => (
            <Button
              key={h}
              size="sm"
              variant={horizon === h ? "default" : "outline"}
              onClick={() => setHorizon(h)}
            >
              {h}
            </Button>
          ))}
          <div className="flex-1" />
          <Button
            size="sm"
            disabled={mutation.isPending || series.length < 5}
            onClick={() => mutation.mutate()}
          >
            {mutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
            <LineChartIcon className="h-4 w-4" />
            {forecastState ? "Re-forecast" : "Run forecast"}
          </Button>
        </div>

        {forecastState && (
          <div className="flex flex-wrap gap-2">
            <Badge variant="outline">μ {forecastState.params.mu.toFixed(5)}</Badge>
            <Badge variant="outline">σ {forecastState.params.sigma.toFixed(5)}</Badge>
            <Badge variant="outline">N {forecastState.params.observations}</Badge>
            <Badge variant="outline">paths {forecastState.params.paths}</Badge>
            <Badge variant="secondary">{forecastState.model_versions.forecast ?? "gbm-mc"}</Badge>
          </div>
        )}

        <div className="h-72">
          {data.length === 0 ? (
            <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
              Provide a series and click <em className={cn("ml-1")}>Run forecast</em>.
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={data} margin={{ top: 8, right: 12, left: 0, bottom: 8 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="step" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
                <Tooltip
                  contentStyle={{
                    background: "hsl(var(--card))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: 8,
                    fontSize: 12,
                  }}
                  formatter={(v: number | number[], name: string) => {
                    if (Array.isArray(v)) return [`${v[0]?.toFixed(2)} ~ ${v[1]?.toFixed(2)}`, name];
                    return [v.toFixed(2), name];
                  }}
                />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Area
                  dataKey="band"
                  name="p05~p95"
                  stroke="hsl(var(--accent) / 0.4)"
                  fill="hsl(var(--accent) / 0.18)"
                  isAnimationActive={false}
                />
                <Line
                  dataKey="p50"
                  name="median"
                  stroke="hsl(var(--chart-4))"
                  strokeWidth={1.5}
                  dot={false}
                  isAnimationActive={false}
                />
                <Line
                  dataKey="mean"
                  name="mean"
                  stroke="hsl(var(--primary))"
                  strokeWidth={2}
                  dot={false}
                  isAnimationActive={false}
                />
              </ComposedChart>
            </ResponsiveContainer>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function parseSeries(text: string): number[] {
  const out: number[] = [];
  for (const tok of text.split(/[\s,;]+/)) {
    if (!tok) continue;
    const n = Number(tok.replace(/[_]/g, ""));
    if (Number.isFinite(n) && n > 0) out.push(n);
  }
  return out;
}

function suggestedSeries(rawText: string): string {
  if (!rawText) return defaultDemoSeries();
  const matches = rawText.match(/-?\d{1,3}(?:[,_]\d{3})+(?:\.\d+)?|-?\d+(?:\.\d+)?/g) ?? [];
  const series: number[] = [];
  for (const m of matches) {
    const n = Number(m.replace(/[,_]/g, ""));
    if (Number.isFinite(n) && n > 0) series.push(n);
    if (series.length >= 60) break;
  }
  if (series.length < 5) return defaultDemoSeries();
  return series.join(", ");
}

function defaultDemoSeries(): string {
  let s = 100;
  const mu = 0.0004;
  const sigma = 0.012;
  const out: number[] = [];
  let r = 1234567;
  const rand = () => {
    r = (Math.imul(r, 48271) % 0x7fffffff) >>> 0;
    return (r & 0xffffff) / 0xffffff;
  };
  for (let i = 0; i < 80; i++) {
    const u1 = Math.max(rand(), 1e-9);
    const u2 = rand();
    const z = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
    s = s * Math.exp(mu - (sigma * sigma) / 2 + sigma * z);
    out.push(Number(s.toFixed(2)));
  }
  return out.join(", ");
}
