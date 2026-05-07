import { useMutation } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Loader2, Layers } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { processRag, ApiError } from "@/lib/api-client";
import { useRAGStore } from "@/stores/useRAGStore";
import { cn } from "@/lib/cn";

const PALETTE = [
  "bg-sky-500/30 border-sky-500/60 text-sky-100",
  "bg-emerald-500/30 border-emerald-500/60 text-emerald-100",
  "bg-fuchsia-500/30 border-fuchsia-500/60 text-fuchsia-100",
  "bg-amber-500/30 border-amber-500/60 text-amber-100",
  "bg-rose-500/30 border-rose-500/60 text-rose-100",
  "bg-indigo-500/30 border-indigo-500/60 text-indigo-100",
];

export function ChunkVisualizer() {
  const ingestState = useRAGStore((s) => s.ingest);
  const processState = useRAGStore((s) => s.process);
  const selectedId = useRAGStore((s) => s.selectedChunkId);
  const setProcess = useRAGStore((s) => s.setProcess);
  const setStage = useRAGStore((s) => s.setStage);
  const setError = useRAGStore((s) => s.setError);
  const selectChunk = useRAGStore((s) => s.selectChunk);

  const mutation = useMutation({
    mutationFn: async () => {
      if (!ingestState) throw new Error("No ingested document");
      setStage("processing");
      setError(null);
      return processRag({
        documentId: ingestState.documentId,
        text: ingestState.rawText,
        chunkSize: 600,
        chunkOverlap: 80,
      });
    },
    onSuccess: (result) => setProcess(result),
    onError: (err) => {
      const msg = err instanceof ApiError ? `${err.code}: ${err.message}` : String(err);
      setError(msg);
      setStage("ingested");
    },
  });

  const synthetic = processState?.model_versions.synthetic_embedding;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Layers className="h-4 w-4" /> 2. Chunk + Embed
        </CardTitle>
        <CardDescription>
          RecursiveCharacterTextSplitter (size=600, overlap=80) → embedding → vector store.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap items-center gap-2">
          <Button
            disabled={!ingestState || mutation.isPending}
            onClick={() => mutation.mutate()}
            size="sm"
          >
            {mutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
            {processState ? "Re-process" : "Process"}
          </Button>
          {processState && (
            <>
              <Badge variant="outline">{processState.chunks.length} chunks</Badge>
              <Badge variant="outline">dim {processState.embeddingDim}</Badge>
              <Badge variant="secondary">{processState.model_versions.embedding}</Badge>
              <Badge variant={processState.model_versions.vector_store === "supabase-pgvector" ? "success" : "outline"}>
                {processState.model_versions.vector_store}
              </Badge>
              {synthetic && <Badge variant="destructive">synthetic embedding</Badge>}
            </>
          )}
        </div>

        {!processState && (
          <div className="rounded-md bg-secondary/40 p-4 text-sm text-muted-foreground">
            Click <em>Process</em> to chunk and embed the document.
          </div>
        )}

        {processState && (
          <div className="grid gap-2 max-h-80 overflow-y-auto pr-1 scrollbar-thin">
            {processState.chunks.map((c, i) => {
              const color = PALETTE[i % PALETTE.length]!;
              const active = selectedId === c.id;
              return (
                <motion.button
                  key={c.id}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: Math.min(i * 0.025, 0.6), duration: 0.25 }}
                  onClick={() => selectChunk(active ? null : c.id)}
                  className={cn(
                    "rounded-md border px-3 py-2 text-left text-xs leading-relaxed transition-all",
                    color,
                    active && "ring-2 ring-primary",
                  )}
                >
                  <div className="mb-1 flex items-center gap-2 text-[10px] uppercase tracking-wide opacity-80">
                    <span>chunk #{c.index}</span>
                    <span>·</span>
                    <span>{c.tokenEstimate} tok</span>
                  </div>
                  <div className="line-clamp-3 whitespace-pre-wrap">{c.content}</div>
                </motion.button>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
