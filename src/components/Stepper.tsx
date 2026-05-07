import { Check } from "lucide-react";
import { cn } from "@/lib/cn";
import { stageIndex, type Stage } from "@/stores/useRAGStore";

const STEPS: { id: Stage; label: string; from: Stage }[] = [
  { id: "ingested", label: "Upload", from: "uploading" },
  { id: "indexed", label: "Chunk + Embed", from: "processing" },
  { id: "searched", label: "Search", from: "searching" },
  { id: "forecasted", label: "Forecast", from: "forecasting" },
];

export function Stepper({ stage }: { stage: Stage }) {
  const idx = stageIndex(stage);
  return (
    <ol className="flex w-full flex-wrap items-center gap-3">
      {STEPS.map((s, i) => {
        const completedAt = stageIndex(s.id);
        const inProgressAt = stageIndex(s.from);
        const completed = idx >= completedAt;
        const active = idx === inProgressAt || idx === completedAt;
        return (
          <li key={s.id} className="flex flex-1 items-center gap-2 min-w-[140px]">
            <div
              className={cn(
                "flex h-8 w-8 items-center justify-center rounded-full border text-xs font-semibold transition-colors",
                completed
                  ? "border-primary bg-primary/20 text-primary"
                  : active
                  ? "border-accent bg-accent/20 text-accent"
                  : "border-border text-muted-foreground",
              )}
            >
              {completed ? <Check className="h-4 w-4" /> : i + 1}
            </div>
            <div className="flex-1">
              <div className={cn("text-sm font-medium", completed ? "text-foreground" : "text-muted-foreground")}>
                {s.label}
              </div>
            </div>
            {i < STEPS.length - 1 && <div className="hidden md:block h-px flex-1 bg-border" />}
          </li>
        );
      })}
    </ol>
  );
}
