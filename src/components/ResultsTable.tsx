"use client";

import { ChevronRight } from "lucide-react";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { formatLabel } from "@/lib/format";
import type { Row } from "@/lib/stats";
import { findItem, type TaskDef } from "@/lib/tasks";
import type { LaneKind, LaneResult } from "@/lib/types";
import { LANE_DOT, ROW_GRID } from "@/lib/ui-tokens";
import { cn } from "@/lib/utils";
import { RowDetails } from "./RowDetails";
import { VerdictCell } from "./VerdictCell";

function LaneHeading({ lane, name }: { lane: LaneKind; name: string }) {
  return (
    <span className="flex items-center gap-2">
      <span className={cn("size-2 rounded-full", LANE_DOT[lane])} aria-hidden />
      {name}
    </span>
  );
}

type Props = {
  task: TaskDef;
  rows: Row[];
  system1Name: string;
  llmName: string;
  compareHasProbabilities: boolean;
  onExplain?: (row: Row) => Promise<LaneResult>;
};

export function ResultsTable({ task, rows, system1Name, llmName, compareHasProbabilities, onExplain }: Props) {
  return (
    <section className="overflow-hidden rounded-xl border" aria-label="Results">
      <div className="overflow-x-auto">
        <div className="min-w-[880px]">
          <div className={cn(ROW_GRID, "border-b bg-muted/40 py-2.5 text-xs font-medium text-muted-foreground")}>
            <span className="pl-6">Item</span>
            <span>Expected</span>
            <LaneHeading lane="system1" name={system1Name} />
            <LaneHeading lane="llm" name={llmName} />
          </div>
          {rows.length === 0 ? (
            <div className="flex flex-col items-center gap-1 px-4 py-16 text-center">
              <p className="font-medium">No results yet</p>
              <p className="text-sm text-muted-foreground">
                Select Start to send the {task.items.length} sample items to both models, or send a live input.
                Select a row to see its details.
              </p>
            </div>
          ) : (
            <ol className="divide-y">
              {rows.map(row => (
                <ResultRow
                  key={row.key}
                  task={task}
                  row={row}
                  system1Name={system1Name}
                  llmName={llmName}
                  compareHasProbabilities={compareHasProbabilities}
                  onExplain={onExplain}
                />
              ))}
            </ol>
          )}
        </div>
      </div>
    </section>
  );
}

type RowProps = Omit<Props, "rows"> & { row: Row };

function ResultRow({ task, row, system1Name, llmName, compareHasProbabilities, onExplain }: RowProps) {
  const [open, setOpen] = useState(false);
  const summary = task.summary(row.input);
  const gold = row.itemId ? findItem(task, row.itemId)?.gold : undefined;
  const toggle = () => setOpen(v => !v);

  return (
    <li className={cn("animate-in fade-in-0 duration-300 motion-reduce:animate-none", open && "bg-muted/30")}>
      <div
        role="button"
        tabIndex={0}
        aria-expanded={open}
        onClick={toggle}
        onKeyDown={e => {
          if (e.key !== "Enter" && e.key !== " ") return;
          e.preventDefault();
          toggle();
        }}
        className={cn(
          ROW_GRID,
          "cursor-pointer py-3 outline-none hover:bg-muted/40 focus-visible:bg-muted/40 focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:ring-inset",
        )}
      >
        <div className="flex min-w-0 gap-2">
          <ChevronRight
            className={cn("mt-0.5 size-4 shrink-0 text-muted-foreground transition-transform", open && "rotate-90")}
            aria-hidden
          />
          <div className="min-w-0">
            <p className="flex items-baseline gap-2">
              <span className="shrink-0 text-xs tabular-nums text-muted-foreground">{row.itemId ?? "live"}</span>
              <span className="truncate text-sm font-medium">{summary.title}</span>
            </p>
            <p className={cn("mt-0.5 text-sm text-muted-foreground", !open && "line-clamp-2")}>{summary.body}</p>
          </div>
        </div>
        <div className="pt-0.5 text-sm">
          {gold ? <span className="font-medium">{formatLabel(gold[task.mainField])}</span> : <Badge variant="outline">Live</Badge>}
        </div>
        <VerdictCell task={task} result={row.results.system1} gold={gold} />
        <VerdictCell task={task} result={row.results.llm} gold={gold} />
      </div>
      {open && (
        <RowDetails
          task={task}
          row={row}
          system1Name={system1Name}
          llmName={llmName}
          compareHasProbabilities={compareHasProbabilities}
          onExplain={onExplain && (() => onExplain(row))}
        />
      )}
    </li>
  );
}
