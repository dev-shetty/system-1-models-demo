import { Check, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { CascadeRow } from "@/lib/cascade";
import { formatLabel } from "@/lib/format";
import { findItem, isMainCorrect, type TaskDef } from "@/lib/tasks";
import type { LaneKind, LaneResult } from "@/lib/types";
import { LANE_DOT, TONE_BADGE } from "@/lib/ui-tokens";
import { cn } from "@/lib/utils";

type Ok = Extract<LaneResult, { ok: true }>;

type BoardItem = { itemId: string; system1: Ok; llm: Ok; confidence: number };

function Verdict({ task, result }: { task: TaskDef; result: Ok }) {
  const value = result.answer.fields[task.mainField]?.value ?? "?";
  return (
    <Badge variant="outline" className={cn("font-medium", TONE_BADGE[task.decision(result.answer).tone])}>
      {formatLabel(value)}
    </Badge>
  );
}

function Mark({ correct }: { correct: boolean }) {
  if (correct) return <Check className="size-4 shrink-0 text-emerald-400" aria-label="Correct" />;
  return <X className="size-4 shrink-0 text-red-400" aria-label="Wrong" />;
}

function Column({
  task,
  lane,
  title,
  items,
  sent,
}: {
  task: TaskDef;
  lane: LaneKind;
  title: string;
  items: BoardItem[];
  sent: boolean;
}) {
  return (
    <div className="flex min-w-0 flex-col bg-background">
      <h2 className="flex items-center gap-2 border-b px-4 py-3 text-sm font-medium">
        <span className={cn("size-2 rounded-full", LANE_DOT[lane])} aria-hidden />
        {title}
        <span className="ml-auto tabular-nums text-muted-foreground">{items.length}</span>
      </h2>
      <ol className="max-h-[50vh] divide-y overflow-y-auto">
        {items.map(item => {
          const gold = findItem(task, item.itemId)!.gold;
          const final = sent ? item.llm : item.system1;
          return (
            <li key={item.itemId} className="flex items-center gap-3 px-4 py-2.5 text-sm">
              <span className="w-8 shrink-0 text-xs tabular-nums text-muted-foreground">{item.itemId}</span>
              <span className="min-w-0 flex-1 truncate">{task.summary(findItem(task, item.itemId)!.input).title}</span>
              <span className="w-12 shrink-0 text-right text-xs tabular-nums text-muted-foreground">
                {Math.round(item.confidence * 100)}%
              </span>
              <Verdict task={task} result={item.system1} />
              {sent && (
                <>
                  <span className="text-muted-foreground" aria-hidden>
                    then
                  </span>
                  <Verdict task={task} result={item.llm} />
                </>
              )}
              <Mark correct={isMainCorrect(task, final.answer, gold)} />
            </li>
          );
        })}
      </ol>
    </div>
  );
}

type Props = { task: TaskDef; rows: CascadeRow[]; threshold: number; system1Name: string; llmName: string };

export function CascadeBoard({ task, rows, threshold, system1Name, llmName }: Props) {
  const items: BoardItem[] = rows
    .flatMap(r => (r.system1?.ok && r.llm?.ok ? [{ itemId: r.itemId, system1: r.system1, llm: r.llm, confidence: r.system1.answer.mainConfidence ?? 0 }] : []))
    .sort((a, b) => b.confidence - a.confidence);
  const kept = items.filter(i => i.confidence >= threshold);
  const sent = items.filter(i => i.confidence < threshold);

  if (items.length === 0) {
    return (
      <section className="rounded-xl border px-4 py-16 text-center">
        <p className="font-medium">No answers loaded</p>
        <p className="mt-1 text-sm text-muted-foreground">
          Select Load answers to get {system1Name} and {llmName} answers for every item. Then move the slider.
        </p>
      </section>
    );
  }

  return (
    <section className="grid gap-px overflow-hidden rounded-xl border bg-border lg:grid-cols-2">
      <Column task={task} lane="system1" title={`${system1Name} decides`} items={kept} sent={false} />
      <Column task={task} lane="llm" title={`Sent to ${llmName}`} items={sent} sent />
    </section>
  );
}
