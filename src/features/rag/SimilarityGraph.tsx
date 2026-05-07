import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Activity } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useRAGStore } from "@/stores/useRAGStore";

export function SimilarityGraph() {
  const search = useRAGStore((s) => s.search);
  const selectChunk = useRAGStore((s) => s.selectChunk);

  const data =
    search?.results.map((r) => ({
      label: `#${r.index}`,
      similarity: Number(r.similarity.toFixed(4)),
      id: r.id,
    })) ?? [];

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Activity className="h-4 w-4" /> Vector Map · Cosine Similarity
        </CardTitle>
        <CardDescription>
          Bars are sim(query, chunk). Click a bar to highlight its source chunk.
        </CardDescription>
      </CardHeader>
      <CardContent className="h-72">
        {data.length === 0 ? (
          <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
            Run a search to populate the similarity map.
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} margin={{ top: 8, right: 12, left: 0, bottom: 8 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="label" stroke="hsl(var(--muted-foreground))" fontSize={12} />
              <YAxis
                domain={[0, 1]}
                stroke="hsl(var(--muted-foreground))"
                fontSize={12}
                tickFormatter={(v) => v.toFixed(2)}
              />
              <Tooltip
                contentStyle={{
                  background: "hsl(var(--card))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: 8,
                  fontSize: 12,
                }}
                formatter={(v: number) => [v.toFixed(4), "cosine"]}
              />
              <Bar
                dataKey="similarity"
                radius={[6, 6, 0, 0]}
                onClick={(d) => d && selectChunk((d as { id?: string }).id ?? null)}
              >
                {data.map((d, i) => (
                  <Cell
                    key={d.id}
                    fill={`hsl(var(--chart-${(i % 5) + 1}))`}
                    cursor="pointer"
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}
