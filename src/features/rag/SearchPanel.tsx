import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Loader2, Search as SearchIcon } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { search, ApiError } from "@/lib/api-client";
import { useRAGStore } from "@/stores/useRAGStore";

export function SearchPanel() {
  const ingestState = useRAGStore((s) => s.ingest);
  const processState = useRAGStore((s) => s.process);
  const setSearch = useRAGStore((s) => s.setSearch);
  const setStage = useRAGStore((s) => s.setStage);
  const setError = useRAGStore((s) => s.setError);
  const searchState = useRAGStore((s) => s.search);
  const [query, setQuery] = useState("");

  const mutation = useMutation({
    mutationFn: async () => {
      if (!processState) throw new Error("Process the document first");
      setStage("searching");
      setError(null);
      return search({
        documentId: processState.documentId,
        query,
        sourceText: ingestState?.rawText,
        topK: 5,
        generateAnswer: true,
      });
    },
    onSuccess: (r) => setSearch(r),
    onError: (err) => {
      const msg = err instanceof ApiError ? `${err.code}: ${err.message}` : String(err);
      setError(msg);
      setStage("indexed");
    },
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <SearchIcon className="h-4 w-4" /> 3. Search & Answer
        </CardTitle>
        <CardDescription>Cosine top-K retrieval, then gpt-4o synthesis.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-center gap-2">
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="질문을 입력하세요…"
            onKeyDown={(e) => e.key === "Enter" && query.trim() && mutation.mutate()}
            disabled={!processState || mutation.isPending}
          />
          <Button
            size="sm"
            onClick={() => mutation.mutate()}
            disabled={!processState || mutation.isPending || query.trim().length === 0}
          >
            {mutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Ask"}
          </Button>
        </div>
        {searchState?.synthetic_embedding && (
          <Badge variant="destructive" className="text-[10px]">
            synthetic embedding (no OPENAI_API_KEY) — answers disabled
          </Badge>
        )}
        {searchState?.answer && (
          <div className="rounded-md border border-primary/30 bg-primary/10 p-3 text-sm leading-relaxed whitespace-pre-wrap">
            {searchState.answer}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
