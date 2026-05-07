import { useMemo, useState } from "react";
import {
  Area,
  Bar,
  BarChart,
  CartesianGrid,
  ComposedChart,
  Line,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Copy, Download, FileText } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { buildMarkdown } from "@/lib/markdown";
import { useRAGStore } from "@/stores/useRAGStore";

export function ReportPanel() {
  const { ingest, process, search, forecast } = useRAGStore((s) => ({
    ingest: s.ingest,
    process: s.process,
    search: s.search,
    forecast: s.forecast,
  }));

  const md = useMemo(() => buildMarkdown({ ingest, process, search, forecast }), [
    ingest,
    process,
    search,
    forecast,
  ]);
  const [copied, setCopied] = useState(false);

  const terminalForecast = useMemo(() => {
    if (!forecast) return [] as Array<{ horizon: string; mean: number; p05: number; p95: number }>;
    return Object.entries(forecast.horizons)
      .map(([h, band]) => {
        const last = band.points[band.points.length - 1];
        if (!last) return null;
        return { horizon: h, mean: last.mean, p05: last.p05, p95: last.p95 };
      })
      .filter(Boolean) as Array<{ horizon: string; mean: number; p05: number; p95: number }>;
  }, [forecast]);

  const retrievalData = (search?.results ?? []).map((r) => ({
    label: `#${r.index}`,
    similarity: r.similarity,
  }));

  const trendForecast = useMemo(() => {
    if (!forecast) return [] as Array<{ label: string; step: number; mean: number; p50: number; band: [number, number] }>;
    const horizonOrder = ["3M", "6M", "12M"];
    const selected =
      horizonOrder.find((h) => forecast.horizons[h]) ??
      Object.keys(forecast.horizons)[0];
    if (!selected) return [];
    const points = forecast.horizons[selected]?.points ?? [];
    return points.map((p) => ({
      label: selected,
      step: p.step,
      mean: p.mean,
      p50: p.p50,
      band: [p.p05, p.p95] as [number, number],
    }));
  }, [forecast]);

  const onCopy = async () => {
    try {
      await navigator.clipboard.writeText(md);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch (e) {
      console.error(e);
    }
  };

  const onDownload = () => {
    const blob = new Blob([md], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${ingest?.documentId ?? "report"}.md`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  const ready = Boolean(ingest || process || search || forecast);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="h-4 w-4" /> 5. Insight Report
        </CardTitle>
        <CardDescription>
          Dashboard-style summary for users and search analysts, plus markdown export.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <MetricCard title="Document" value={ingest?.filename ?? "-"} hint={ingest?.kind ?? "not loaded"} />
          <MetricCard title="Chunks" value={String(process?.chunks.length ?? 0)} hint={`dim ${process?.embeddingDim ?? 0}`} />
          <MetricCard title="Top Similarity" value={search?.results[0] ? search.results[0].similarity.toFixed(3) : "-"} hint={search?.query ?? "no query"} />
          <MetricCard title="Forecast μ / σ" value={forecast ? `${forecast.params.mu.toFixed(4)} / ${forecast.params.sigma.toFixed(4)}` : "-"} hint={forecast ? `${forecast.params.observations} obs` : "no forecast"} />
        </div>

        <Tabs defaultValue="visual" className="w-full">
          <TabsList className="w-full flex-wrap">
            <TabsTrigger value="visual">Visual Summary</TabsTrigger>
            <TabsTrigger value="answer">Answer & Sources</TabsTrigger>
            <TabsTrigger value="markdown">Markdown</TabsTrigger>
          </TabsList>

          <TabsContent value="visual" className="space-y-4">
            <div className="grid gap-4 lg:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">Retrieval Scores</CardTitle>
                </CardHeader>
                <CardContent className="h-56">
                  {retrievalData.length === 0 ? (
                    <Empty text="Run Ask to display retrieval chart." />
                  ) : (
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={retrievalData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                        <XAxis dataKey="label" fontSize={11} stroke="hsl(var(--muted-foreground))" />
                        <YAxis domain={[0, 1]} fontSize={11} stroke="hsl(var(--muted-foreground))" />
                        <Tooltip />
                        <Bar dataKey="similarity" fill="hsl(var(--chart-2))" radius={[6, 6, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">Forecast Terminal Bands</CardTitle>
                </CardHeader>
                <CardContent className="h-56">
                  {terminalForecast.length === 0 ? (
                    <Empty text="Run forecast to display horizon bands." />
                  ) : (
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={terminalForecast}>
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                        <XAxis dataKey="horizon" fontSize={11} stroke="hsl(var(--muted-foreground))" />
                        <YAxis fontSize={11} stroke="hsl(var(--muted-foreground))" />
                        <Tooltip />
                        <Bar dataKey="p05" fill="hsl(var(--chart-5))" name="p05" />
                        <Bar dataKey="mean" fill="hsl(var(--chart-1))" name="mean" />
                        <Bar dataKey="p95" fill="hsl(var(--chart-4))" name="p95" />
                      </BarChart>
                    </ResponsiveContainer>
                  )}
                </CardContent>
              </Card>
            </div>
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Forecast Confidence Trend</CardTitle>
                <CardDescription>
                  Time progression of mean/median with 5-95% confidence band.
                </CardDescription>
              </CardHeader>
              <CardContent className="h-64">
                {trendForecast.length === 0 ? (
                  <Empty text="Run forecast to display confidence trend." />
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart data={trendForecast}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis dataKey="step" fontSize={11} stroke="hsl(var(--muted-foreground))" />
                      <YAxis fontSize={11} stroke="hsl(var(--muted-foreground))" />
                      <Tooltip
                        formatter={(v: number | number[], name: string) => {
                          if (Array.isArray(v)) return [`${v[0]?.toFixed(2)} ~ ${v[1]?.toFixed(2)}`, name];
                          return [Number(v).toFixed(2), name];
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
                        stroke="hsl(var(--chart-1))"
                        strokeWidth={2}
                        dot={false}
                        isAnimationActive={false}
                      />
                    </ComposedChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="answer" className="space-y-3">
            {search?.answer ? (
              <div className="rounded-md border border-primary/30 bg-primary/10 p-4 text-sm whitespace-pre-wrap">
                {search.answer}
              </div>
            ) : (
              <Empty text="No generated answer yet." />
            )}
            <div className="space-y-2 max-h-60 overflow-auto scrollbar-thin pr-1">
              {(search?.results ?? []).map((r) => (
                <div key={r.id} className="rounded-md border border-border p-3 text-xs">
                  <div className="mb-1 flex items-center gap-2 text-[11px] text-muted-foreground">
                    <Badge variant="outline">chunk #{r.index}</Badge>
                    <span>sim {r.similarity.toFixed(4)}</span>
                  </div>
                  <div className="line-clamp-4 whitespace-pre-wrap">{r.content}</div>
                </div>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="markdown" className="space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <Button size="sm" onClick={onCopy} disabled={!ready}>
                <Copy className="h-4 w-4" /> Copy
              </Button>
              <Button size="sm" variant="outline" onClick={onDownload} disabled={!ready}>
                <Download className="h-4 w-4" /> Download .md
              </Button>
              {copied && <Badge variant="success">copied</Badge>}
              {!ready && <Badge variant="outline">empty — run pipeline first</Badge>}
            </div>
            <pre className="max-h-80 overflow-auto rounded-md border border-border bg-card/60 p-4 text-xs leading-relaxed scrollbar-thin">
{md}
            </pre>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}

function MetricCard({ title, value, hint }: { title: string; value: string; hint: string }) {
  return (
    <div className="rounded-md border border-border bg-card/60 p-3">
      <div className="text-[11px] uppercase tracking-wide text-muted-foreground">{title}</div>
      <div className="mt-1 text-sm font-semibold truncate">{value}</div>
      <div className="mt-1 text-[11px] text-muted-foreground truncate">{hint}</div>
    </div>
  );
}

function Empty({ text }: { text: string }) {
  return <div className="flex h-full items-center justify-center text-sm text-muted-foreground">{text}</div>;
}
