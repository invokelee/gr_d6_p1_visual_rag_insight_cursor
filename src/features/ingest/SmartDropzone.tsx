import { useCallback, useRef, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { FileText, Image as ImageIcon, Loader2, Upload } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ingest, ApiError } from "@/lib/api-client";
import { estimateTokensClient } from "@/lib/tokenizer";
import { useRAGStore } from "@/stores/useRAGStore";
import { cn } from "@/lib/cn";

const ACCEPTED = ".pdf,.txt,.md,.json,image/png,image/jpeg,image/webp,image/gif";

export function SmartDropzone() {
  const setIngest = useRAGStore((s) => s.setIngest);
  const setError = useRAGStore((s) => s.setError);
  const setStage = useRAGStore((s) => s.setStage);
  const ingestState = useRAGStore((s) => s.ingest);

  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string>("");
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const mutation = useMutation({
    mutationFn: async (f: File) => {
      setStage("uploading");
      setError(null);
      return ingest(f);
    },
    onSuccess: (result) => setIngest(result),
    onError: (err) => {
      const msg = err instanceof ApiError ? `${err.code}: ${err.message}` : String(err);
      setError(msg);
      setStage("idle");
    },
  });

  const handleFile = useCallback((f: File) => {
    setFile(f);
    if (f.type.startsWith("text/") || f.name.endsWith(".md") || f.name.endsWith(".txt") || f.name.endsWith(".json")) {
      f.text().then((t) => setPreview(t.slice(0, 4000)));
    } else {
      setPreview("");
    }
  }, []);

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const f = e.dataTransfer.files[0];
    if (f) handleFile(f);
  };

  const onChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) handleFile(f);
  };

  const localTokens = preview ? estimateTokensClient(preview) : null;
  const fileIcon = file && file.type.startsWith("image/") ? ImageIcon : FileText;
  const Icon = fileIcon;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Upload className="h-4 w-4" /> 1. Source Document
        </CardTitle>
        <CardDescription>PDF, TXT/MD, or image (OCR via gpt-4o vision).</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={onDrop}
          onClick={() => inputRef.current?.click()}
          className={cn(
            "flex cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border border-dashed py-8 text-center transition-colors",
            dragOver ? "border-primary bg-primary/10" : "border-border bg-secondary/30 hover:bg-secondary/50",
          )}
        >
          <motion.div
            animate={{ y: dragOver ? -4 : 0 }}
            className="rounded-full bg-primary/10 p-3 text-primary"
          >
            <Upload className="h-5 w-5" />
          </motion.div>
          <div className="text-sm font-medium">Drop a file or click to browse</div>
          <div className="text-xs text-muted-foreground">
            .pdf · .txt · .md · .png · .jpg · .webp
          </div>
          <input
            ref={inputRef}
            type="file"
            className="sr-only"
            accept={ACCEPTED}
            onChange={onChange}
          />
        </div>

        {file && (
          <div className="rounded-md border border-border bg-card p-3 text-sm">
            <div className="flex items-center gap-2">
              <Icon className="h-4 w-4 text-primary" />
              <div className="flex-1 truncate font-medium">{file.name}</div>
              <Badge variant="secondary">{(file.size / 1024).toFixed(1)} KB</Badge>
              {localTokens && <Badge variant="outline">~{localTokens} tok</Badge>}
            </div>
          </div>
        )}

        <Button
          className="w-full"
          disabled={!file || mutation.isPending}
          onClick={() => file && mutation.mutate(file)}
        >
          {mutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
          {mutation.isPending ? "Ingesting…" : ingestState ? "Re-ingest" : "Ingest"}
        </Button>

        {ingestState && (
          <div className="rounded-md bg-emerald-500/10 p-3 text-xs text-emerald-300">
            Ingested <strong>{ingestState.filename}</strong> · {ingestState.kind} · {ingestState.tokens} tokens
          </div>
        )}
      </CardContent>
    </Card>
  );
}
