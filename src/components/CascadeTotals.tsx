import type { CascadeSummary, Strategy } from "@/lib/cascade";
import { formatPct, formatUsd } from "@/lib/format";
import type { LaneKind } from "@/lib/types";
import { LANE_DOT } from "@/lib/ui-tokens";
import { cn } from "@/lib/utils";

const ONE_MILLION = 1_000_000;

type Props = { summary: CascadeSummary; system1Name: string; llmName: string };

export function CascadeTotals({ summary, system1Name, llmName }: Props) {
  const columns: { title: string; lanes: LaneKind[]; strategy: Strategy; highlight?: boolean }[] = [
    { title: `${system1Name} only`, lanes: ["system1"], strategy: summary.system1Only },
    { title: "Cascade", lanes: ["system1", "llm"], strategy: summary.cascade, highlight: true },
    { title: `${llmName} only`, lanes: ["llm"], strategy: summary.llmOnly },
  ];
  return (
    <section className="grid gap-px overflow-hidden rounded-xl border bg-border sm:grid-cols-3">
      {columns.map(c => (
        <div key={c.title} className={cn("flex flex-col gap-3 bg-background p-5", c.highlight && "bg-muted/40")}>
          <h2 className="flex items-center gap-2 text-sm font-medium">
            <span className="flex gap-0.5" aria-hidden>
              {c.lanes.map(l => (
                <span key={l} className={cn("size-2 rounded-full", LANE_DOT[l])} />
              ))}
            </span>
            {c.title}
          </h2>
          <dl className="grid grid-cols-2 gap-4">
            <div>
              <dt className="text-sm text-muted-foreground">Cost for 1M items</dt>
              <dd className="mt-1 text-2xl font-semibold tabular-nums tracking-tight">
                {summary.rows ? formatUsd((c.strategy.costUsd / summary.rows) * ONE_MILLION) : "–"}
              </dd>
            </div>
            <div>
              <dt className="text-sm text-muted-foreground">Accuracy</dt>
              <dd className="mt-1 text-2xl font-semibold tabular-nums tracking-tight">
                {formatPct(c.strategy.correct, summary.rows)}
              </dd>
            </div>
          </dl>
        </div>
      ))}
    </section>
  );
}
