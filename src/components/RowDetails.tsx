"use client";

import { Loader2, MessageSquareText } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { formatInt, formatLabel, formatMs, formatUsd } from "@/lib/format";
import type { Row } from "@/lib/stats";
import { findItem, type TaskDef } from "@/lib/tasks";
import type { FieldSpec, FieldValue, GoldValue, LaneKind, LaneResult } from "@/lib/types";
import { LANE_DOT } from "@/lib/ui-tokens";
import { cn } from "@/lib/utils";

type Ok = Extract<LaneResult, { ok: true }>;
type Explanation = { status: "idle" } | { status: "loading" } | { status: "done"; result: LaneResult };
type Option = { key: GoldValue; label: string; description?: string };

function optionsFor(field: FieldSpec): Option[] {
  if (field.kind === "choice") {
    return Object.entries(field.labels).map(([key, description]) => ({ key, label: formatLabel(key), description }));
  }
  return [
    { key: true, label: "Yes", description: field.whenTrue },
    { key: false, label: "No", description: field.whenFalse },
  ];
}

function probabilityOf(field: FieldSpec, value: FieldValue | undefined, key: GoldValue): number | null {
  if (!value) return null;
  if (field.kind === "noul") return key === true ? (value.prob ?? null) : 1 - (value.prob ?? 0);
  return value.probs?.[String(key)] ?? null;
}

function Pick({ lane, name, percent }: { lane: LaneKind; name: string; percent: number | null }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-xs">
      <span className={cn("size-1.5 rounded-full", LANE_DOT[lane])} aria-hidden />
      {name}
      {percent !== null && <span className="tabular-nums text-muted-foreground">{percent}%</span>}
    </span>
  );
}

type QuestionProps = {
  field: FieldSpec;
  system1: Ok | undefined;
  llm: Ok | undefined;
  system1Name: string;
  llmName: string;
  compareHasProbabilities: boolean;
  gold: GoldValue | undefined;
  reason: string | undefined;
};

const RUNNER_UP_MIN = 0.05;

type Ranked = { option: Option; p: number };

function rankOptions(field: FieldSpec, value: FieldValue | undefined): Ranked[] {
  if (!value) return [];
  return optionsFor(field)
    .map(option => ({ option, p: probabilityOf(field, value, option.key) }))
    .filter((r): r is Ranked => r.p !== null)
    .sort((a, b) => b.p - a.p);
}

const pct = (p: number) => `${Math.round(p * 100)}%`;

type SummaryEntry = { lane: LaneKind; name: string; ranked: Ranked[] };

// One aligned row per model, so the two picks can be compared column by column.
function PickSummary({ field, entries }: { field: FieldSpec; entries: SummaryEntry[] }) {
  const rows = entries.filter(e => e.ranked.length > 0);
  if (rows.length === 0) return null;
  return (
    <dl className="mt-1 grid w-fit grid-cols-[auto_auto_auto_auto] items-baseline gap-x-3 gap-y-1 text-sm">
      {rows.map(({ lane, name, ranked: [first, second] }) => {
        const showRunnerUp = field.kind === "choice" && second && second.p >= RUNNER_UP_MIN;
        return (
          <div key={lane} className="contents">
            <dt className="flex items-center gap-2 text-muted-foreground">
              <span className={cn("size-1.5 shrink-0 rounded-full", LANE_DOT[lane])} aria-hidden />
              {name}
            </dt>
            <dd className="font-medium">{first.option.label}</dd>
            <dd className="text-right font-medium tabular-nums">{pct(first.p)}</dd>
            <dd className="text-muted-foreground tabular-nums">
              {showRunnerUp && `runner-up ${second.option.label} ${pct(second.p)}`}
            </dd>
          </div>
        );
      })}
    </dl>
  );
}

function ProbabilityBar({ lane, name, p, picked }: { lane: LaneKind; name: string; p: number | null; picked: boolean }) {
  const fill = picked ? LANE_DOT[lane] : lane === "system1" ? "bg-system1/30" : "bg-llm/30";
  return (
    <div className="flex items-center gap-2" title={`${name} probability`}>
      <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted" aria-hidden>
        <span className={cn("block h-full rounded-full", fill)} style={{ width: `${Math.round((p ?? 0) * 100)}%` }} />
      </span>
      <span className={cn("w-9 text-right text-xs tabular-nums", picked ? "font-medium text-foreground" : "text-muted-foreground")}>
        {p === null ? "–" : `${Math.round(p * 100)}%`}
      </span>
    </div>
  );
}

function QuestionBlock({ field, system1, llm, system1Name, llmName, compareHasProbabilities, gold, reason }: QuestionProps) {
  const system1Value = system1?.answer.fields[field.id];
  const llmValue = llm?.answer.fields[field.id];
  return (
    <div className="flex flex-col gap-3 p-5">
      <div className="flex flex-col gap-1">
        <p className="text-xs text-muted-foreground">
          {field.id}, {field.kind === "choice" ? "pick one label" : "yes or no"}
        </p>
        <p className="font-medium">{field.question}</p>
        <PickSummary
          field={field}
          entries={[
            { lane: "system1", name: system1Name, ranked: rankOptions(field, system1Value) },
            ...(compareHasProbabilities ? [{ lane: "llm" as const, name: llmName, ranked: rankOptions(field, llmValue) }] : []),
          ]}
        />
      </div>
      <ul className="flex flex-col gap-1">
        {optionsFor(field).map(option => {
          const system1Picked = system1Value?.value === option.key;
          const llmPicked = llmValue?.value === option.key;
          const llmPercent = probabilityOf(field, llmValue, option.key);
          return (
            <li
              key={String(option.key)}
              className={cn(
                "grid grid-cols-[minmax(0,1fr)_10rem_14rem] items-center gap-4 rounded-lg px-3 py-2",
                (system1Picked || llmPicked) && "bg-muted/50",
              )}
            >
              <div className="min-w-0">
                <p className="flex items-baseline gap-2 text-sm font-medium">
                  {option.label}
                  {gold === option.key && <span className="text-xs font-normal text-emerald-400">expected</span>}
                </p>
                {option.description && <p className="truncate text-xs text-muted-foreground">{option.description}</p>}
              </div>
              <div className="flex flex-col gap-1">
                <ProbabilityBar
                  lane="system1"
                  name={system1Name}
                  p={probabilityOf(field, system1Value, option.key)}
                  picked={system1Picked}
                />
                {compareHasProbabilities && (
                  <ProbabilityBar lane="llm" name={llmName} p={llmPercent} picked={llmPicked} />
                )}
              </div>
              <div className="flex flex-wrap justify-end gap-1.5">
                {system1Picked && <Pick lane="system1" name={system1Name} percent={null} />}
                {llmPicked && (
                  <Pick
                    lane="llm"
                    name={llmName}
                    percent={compareHasProbabilities || llmPercent === null ? null : Math.round(llmPercent * 100)}
                  />
                )}
              </div>
            </li>
          );
        })}
      </ul>
      {reason && (
        <p className="flex gap-2 text-sm text-muted-foreground">
          <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-llm" aria-hidden />
          <span>
            <span className="text-foreground">{llmName}:</span> {reason}
          </span>
        </p>
      )}
    </div>
  );
}

function Metrics({ lane, name, result, children }: { lane: LaneKind; name: string; result: LaneResult | null; children?: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-3 p-5">
      <h3 className="flex items-center gap-2 text-sm font-medium">
        <span className={cn("size-2 rounded-full", LANE_DOT[lane])} aria-hidden />
        {name}
      </h3>
      {result?.ok && (
        <dl className="grid grid-cols-4 gap-3 text-sm tabular-nums">
          {[
            ["Time", formatMs(result.latencyMs)],
            ["Tokens in", formatInt(result.usage.input + result.usage.cacheRead + result.usage.cacheWrite)],
            ["Tokens out", formatInt(result.usage.output)],
            ["Cost", formatUsd(result.costUsd)],
          ].map(([label, value]) => (
            <div key={label}>
              <dt className="text-xs text-muted-foreground">{label}</dt>
              <dd className="mt-0.5 font-medium">{value}</dd>
            </div>
          ))}
        </dl>
      )}
      {result && !result.ok && <p className="text-sm text-destructive">{result.error}</p>}
      {!result && <p className="text-sm text-muted-foreground">Waiting</p>}
      {children}
    </div>
  );
}

function ExplainControl({ explanation, system1Name, llmName, labelOnly, onAsk }: {
  explanation: Explanation;
  system1Name: string;
  llmName: string;
  labelOnly: Ok | undefined;
  onAsk(): void;
}) {
  if (explanation.status === "idle") {
    return (
      <Button
        variant="outline"
        size="sm"
        className="w-fit"
        onClick={e => {
          e.stopPropagation();
          onAsk();
        }}
      >
        <MessageSquareText /> Ask {llmName} why
      </Button>
    );
  }
  if (explanation.status === "loading") {
    return (
      <p className="flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="size-4 animate-spin motion-reduce:animate-none" aria-hidden /> Asking {llmName}
      </p>
    );
  }
  const result = explanation.result;
  if (!result.ok) return <p className="text-sm text-destructive">{result.error}</p>;
  const extraOut = labelOnly ? result.usage.output - labelOnly.usage.output : null;
  return (
    <p className="text-xs tabular-nums text-muted-foreground">
      The reasons cost {formatUsd(result.costUsd)} and {formatInt(result.usage.output)} output tokens
      {extraOut !== null && extraOut > 0 && `, ${formatInt(extraOut)} more than the labels alone`}. {system1Name} cannot give
      reasons, because it does not write text.
    </p>
  );
}

type Props = {
  task: TaskDef;
  row: Row;
  system1Name: string;
  llmName: string;
  compareHasProbabilities: boolean;
  onExplain?: () => Promise<LaneResult>;
};

export function RowDetails({ task, row, system1Name, llmName, compareHasProbabilities, onExplain }: Props) {
  const [explanation, setExplanation] = useState<Explanation>({ status: "idle" });
  const system1 = row.results.system1?.ok ? row.results.system1 : undefined;
  const llm = row.results.llm?.ok ? row.results.llm : undefined;
  const gold = row.itemId ? findItem(task, row.itemId)?.gold : undefined;
  const explained = explanation.status === "done" && explanation.result.ok ? explanation.result : undefined;

  const ask = async () => {
    if (!onExplain) return;
    setExplanation({ status: "loading" });
    setExplanation({ status: "done", result: await onExplain() });
  };

  return (
    <div className="px-4 pt-1 pb-5 pl-10" onClick={e => e.stopPropagation()}>
      <div className="overflow-hidden rounded-xl border bg-background">
        <div className="divide-y">
          {task.fields.map(field => (
            <QuestionBlock
              key={field.id}
              field={field}
              system1={system1}
              llm={llm}
              system1Name={system1Name}
              llmName={llmName}
              compareHasProbabilities={compareHasProbabilities}
              gold={gold?.[field.id]}
              reason={explained?.answer.fields[field.id]?.reason}
            />
          ))}
        </div>
        <div className="grid divide-x border-t bg-muted/20 md:grid-cols-2">
          <Metrics lane="system1" name={system1Name} result={row.results.system1} />
          <Metrics lane="llm" name={llmName} result={row.results.llm}>
            {onExplain && (
              <ExplainControl
                explanation={explanation}
                system1Name={system1Name}
                llmName={llmName}
                labelOnly={llm}
                onAsk={ask}
              />
            )}
          </Metrics>
        </div>
      </div>
    </div>
  );
}
