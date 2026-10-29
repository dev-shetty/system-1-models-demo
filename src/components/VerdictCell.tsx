import { Check, CircleAlert, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { formatLabel, formatMs } from "@/lib/format";
import { isCorrect, type TaskDef } from "@/lib/tasks";
import type { GoldValue, LaneResult } from "@/lib/types";
import { TONE_BADGE } from "@/lib/ui-tokens";
import { cn } from "@/lib/utils";

type Props = {
  task: TaskDef;
  result: LaneResult | null;
  gold: Record<string, GoldValue> | undefined;
};

export function VerdictCell({ task, result, gold }: Props) {
  if (!result) {
    return (
      <div className="flex items-center gap-2 pt-0.5 text-sm text-muted-foreground">
        <span className="size-1.5 animate-pulse rounded-full bg-current motion-reduce:animate-none" aria-hidden />
        Waiting
      </div>
    );
  }
  if (!result.ok) {
    return (
      <p className="flex items-start gap-1.5 pt-0.5 text-sm text-destructive">
        <CircleAlert className="mt-0.5 size-3.5 shrink-0" aria-hidden />
        {result.error}
      </p>
    );
  }

  const main = result.answer.fields[task.mainField];
  const decision = task.decision(result.answer);
  const correct = gold ? isCorrect(main, gold[task.mainField]) : null;

  return (
    <div className="flex items-center gap-2.5 self-start">
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge variant="outline" className={cn("font-medium", TONE_BADGE[decision.tone])}>
            {main ? formatLabel(main.value) : "?"}
          </Badge>
        </TooltipTrigger>
        <TooltipContent>Action: {decision.label}</TooltipContent>
      </Tooltip>
      {main?.prob !== undefined && (
        <span className="text-sm font-medium tabular-nums">{Math.round(main.prob * 100)}%</span>
      )}
      {correct === true && <Check className="size-4 text-emerald-400" aria-label="Matches the expected answer" />}
      {correct === false && <X className="size-4 text-destructive" aria-label="Does not match the expected answer" />}
      <span className="ml-auto shrink-0 text-xs tabular-nums text-muted-foreground">{formatMs(result.latencyMs)}</span>
    </div>
  );
}
