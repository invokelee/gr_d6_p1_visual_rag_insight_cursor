import { Sparkles, X } from "lucide-react";
import { Stepper } from "@/components/Stepper";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { SmartDropzone } from "@/features/ingest/SmartDropzone";
import { ChunkVisualizer } from "@/features/rag/ChunkVisualizer";
import { ChunkStatsChart } from "@/features/rag/ChunkStatsChart";
import { EmbeddingMap } from "@/features/rag/EmbeddingMap";
import { SimilarityGraph } from "@/features/rag/SimilarityGraph";
import { SearchPanel } from "@/features/rag/SearchPanel";
import { SearchResults } from "@/features/rag/SearchResults";
import { ForecastChart } from "@/features/predict/ForecastChart";
import { ReportPanel } from "@/features/report/ReportPanel";
import { useRAGStore } from "@/stores/useRAGStore";

export default function App() {
  const stage = useRAGStore((s) => s.stage);
  const error = useRAGStore((s) => s.error);
  const setError = useRAGStore((s) => s.setError);
  const reset = useRAGStore((s) => s.reset);

  return (
    <div className="container mx-auto py-6 space-y-6">
      <header className="space-y-3">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-primary/15 p-2 text-primary">
              <Sparkles className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-xl font-semibold tracking-tight">Visual RAG Insight Platform</h1>
              <p className="text-xs text-muted-foreground">
                Transparent RAG · Predictive Engine · Visual Report
              </p>
            </div>
          </div>
          <Button variant="ghost" size="sm" onClick={reset}>
            Reset session
          </Button>
        </div>
        <Stepper stage={stage} />
        {error && (
          <div className="flex items-start gap-2 rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
            <span className="flex-1 break-words">{error}</span>
            <button onClick={() => setError(null)} aria-label="dismiss">
              <X className="h-4 w-4" />
            </button>
          </div>
        )}
      </header>

      <main className="grid gap-6 lg:grid-cols-[360px_1fr]">
        <div className="space-y-6">
          <SmartDropzone />
          <SearchPanel />
        </div>

        <div className="space-y-6 min-w-0">
          <Tabs defaultValue="pipeline">
            <TabsList>
              <TabsTrigger value="pipeline">Pipeline</TabsTrigger>
              <TabsTrigger value="vector">Vector Map</TabsTrigger>
              <TabsTrigger value="forecast">Forecast</TabsTrigger>
            </TabsList>
            <TabsContent value="pipeline">
              <div className="grid gap-4 xl:grid-cols-2">
                <ChunkVisualizer />
                <ChunkStatsChart />
              </div>
            </TabsContent>
            <TabsContent value="vector">
              <div className="grid gap-4 lg:grid-cols-2">
                <SimilarityGraph />
                <EmbeddingMap />
                <div className="lg:col-span-2">
                  <SearchResults />
                </div>
              </div>
            </TabsContent>
            <TabsContent value="forecast">
              <ForecastChart />
            </TabsContent>
          </Tabs>

          <ReportPanel />
        </div>
      </main>

      <footer className="pt-4 text-center text-[11px] text-muted-foreground">
        gpt-4o · text-embedding-3-small · Supabase pgvector (or in-memory) · Vercel Functions
      </footer>
    </div>
  );
}
