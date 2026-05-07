import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useRAGStore } from "@/stores/useRAGStore";
import { cn } from "@/lib/cn";

export function SearchResults() {
  const search = useRAGStore((s) => s.search);
  const selectedId = useRAGStore((s) => s.selectedChunkId);
  const selectChunk = useRAGStore((s) => s.selectChunk);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Top-K Results</CardTitle>
        <CardDescription>
          Source chunks ranked by cosine similarity to the query embedding.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {!search ? (
          <div className="rounded-md bg-secondary/40 p-4 text-sm text-muted-foreground">
            Results appear here after a search.
          </div>
        ) : (
          <ul className="space-y-2 max-h-80 overflow-y-auto pr-1 scrollbar-thin">
            {search.results.map((r) => {
              const active = selectedId === r.id;
              return (
                <li
                  key={r.id}
                  className={cn(
                    "rounded-md border p-3 text-xs leading-relaxed transition-colors cursor-pointer",
                    active
                      ? "border-primary bg-primary/10"
                      : "border-border bg-card hover:border-primary/50",
                  )}
                  onClick={() => selectChunk(active ? null : r.id)}
                >
                  <div className="mb-1 flex items-center gap-2 text-[10px] uppercase tracking-wide text-muted-foreground">
                    <span>chunk #{r.index}</span>
                    <Badge variant="outline" className="text-[10px]">
                      sim {r.similarity.toFixed(4)}
                    </Badge>
                    <span>· {r.tokenEstimate} tok</span>
                  </div>
                  <div className="whitespace-pre-wrap">{r.content}</div>
                </li>
              );
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
