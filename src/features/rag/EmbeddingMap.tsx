import {
  CartesianGrid,
  ResponsiveContainer,
  Scatter,
  ScatterChart,
  Tooltip,
  XAxis,
  YAxis,
  ZAxis,
} from "recharts";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useRAGStore } from "@/stores/useRAGStore";

export function EmbeddingMap() {
  const process = useRAGStore((s) => s.process);
  const selectChunk = useRAGStore((s) => s.selectChunk);
  const data = process?.embeddingPoints ?? [];

  return (
    <Card>
      <CardHeader>
        <CardTitle>Embedding Projection</CardTitle>
        <CardDescription>
          2D projection of chunk embeddings. Point size reflects token volume.
        </CardDescription>
      </CardHeader>
      <CardContent className="h-72">
        {data.length === 0 ? (
          <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
            Process a document to render embedding space.
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <ScatterChart margin={{ top: 8, right: 12, left: 0, bottom: 8 }}>
              <CartesianGrid stroke="hsl(var(--border))" strokeDasharray="3 3" />
              <XAxis type="number" dataKey="x" domain={[0, 1]} tick={false} axisLine={false} />
              <YAxis type="number" dataKey="y" domain={[0, 1]} tick={false} axisLine={false} />
              <ZAxis type="number" dataKey="tokenEstimate" range={[60, 320]} />
              <Tooltip
                cursor={{ strokeDasharray: "3 3" }}
                contentStyle={{
                  background: "hsl(var(--card))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: 8,
                  fontSize: 12,
                }}
                formatter={(v: number, name: string) => [Number(v).toFixed(3), name]}
                labelFormatter={(_, payload) => {
                  const p = payload?.[0]?.payload as { index?: number } | undefined;
                  return p?.index !== undefined ? `chunk #${p.index}` : "chunk";
                }}
              />
              <Scatter
                data={data}
                fill="hsl(var(--chart-4))"
                onClick={(point) => selectChunk((point as { id?: string })?.id ?? null)}
              />
            </ScatterChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}
