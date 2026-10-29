import { ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { formatInt, formatMs, formatPct, formatRatio, formatUsd } from "@/lib/format";
import type { LaneStats } from "@/lib/stats";
import { LANE_DOT } from "@/lib/ui-tokens";
import { SYSTEM1_LABELS } from "@/lib/pricing";
import type { LaneKind, System1Model } from "@/lib/types";
import { cn } from "@/lib/utils";

const ONE_MILLION = 1_000_000;

type Bar = { lane: LaneKind; name: string; value: string; fraction: number };

function fractions(a: number | null, b: number | null): [number, number] {
  const max = Math.max(a ?? 0, b ?? 0);
  if (max === 0) return [0, 0];
  return [(a ?? 0) / max, (b ?? 0) / max];
}

function Metric({ label, bars, caption }: { label: string; bars: Bar[]; caption: string }) {
  return (
    <div className="flex flex-col gap-4 bg-background p-5">
      <h2 className="text-sm text-muted-foreground">{label}</h2>
      <dl className="flex flex-col gap-3">
        {bars.map(bar => (
          <div key={bar.lane} className="grid grid-cols-[minmax(0,9.5rem)_minmax(3rem,1fr)_auto] items-center gap-3">
            <dt className="flex min-w-0 items-center gap-2 text-sm">
              <span className={cn("size-2 shrink-0 rounded-full", LANE_DOT[bar.lane])} aria-hidden />
              <span className="truncate">{bar.name}</span>
            </dt>
            <div className="h-1.5 overflow-hidden rounded-full bg-muted" aria-hidden>
              <div
                className={cn("h-full rounded-full transition-[width] duration-500 ease-out motion-reduce:transition-none", LANE_DOT[bar.lane])}
                style={{ width: `${Math.round(bar.fraction * 100)}%` }}
              />
            </div>
            <dd className="min-w-20 text-right text-xl font-semibold tabular-nums tracking-tight">{bar.value}</dd>
          </div>
        ))}
      </dl>
      <p className="mt-auto text-sm text-muted-foreground">{caption}</p>
    </div>
  );
}

function perMillion(stats: LaneStats): number | null {
  return stats.costPerRequest === null ? null : stats.costPerRequest * ONE_MILLION;
}

const COST_CAPTION: Record<System1Model, string> = {
  laya: "Laya runs on this laptop, so it has no API cost. Its cost is the hardware.",
  jev: "Jev charges $0.042 per 1M input tokens. Output tokens are free.",
};

function fasterCaption(name: string, system1: LaneStats, llm: LaneStats): string {
  if (system1.p50Ms === null || llm.p50Ms === null || system1.p50Ms === 0) return "Median time for one answer.";
  if (system1.p50Ms <= llm.p50Ms) return `${name} answers ${formatRatio(llm.p50Ms / system1.p50Ms)} faster.`;
  return `${name} answers ${formatRatio(system1.p50Ms / llm.p50Ms)} slower.`;
}

type Props = { system1: LaneStats; llm: LaneStats; system1Model: System1Model; llmName: string };

export function Scoreboard({ system1, llm, system1Model, llmName }: Props) {
  const system1Name = SYSTEM1_LABELS[system1Model];
  const [costSystem1, costLlm] = fractions(perMillion(system1), perMillion(llm));
  const [timeSystem1, timeLlm] = fractions(system1.p50Ms, llm.p50Ms);
  const acc = (s: LaneStats) => (s.scored ? s.correct / s.scored : 0);
  const usd = (n: number | null) => (n === null ? "–" : formatUsd(n));

  return (
    <section className="flex flex-col gap-2">
      <div className="grid gap-px overflow-hidden rounded-xl border bg-border md:grid-cols-3">
        <Metric
          label="Cost for 1M items"
          caption={COST_CAPTION[system1Model]}
          bars={[
            { lane: "system1", name: system1Name, value: usd(perMillion(system1)), fraction: costSystem1 },
            { lane: "llm", name: llmName, value: usd(perMillion(llm)), fraction: costLlm },
          ]}
        />
        <Metric
          label="Median latency"
          caption={fasterCaption(system1Name, system1, llm)}
          bars={[
            { lane: "system1", name: system1Name, value: formatMs(system1.p50Ms), fraction: timeSystem1 },
            { lane: "llm", name: llmName, value: formatMs(llm.p50Ms), fraction: timeLlm },
          ]}
        />
        <Metric
          label="Accuracy on the main label"
          caption={`Checked against ${formatInt(Math.max(system1.scored, llm.scored))} labeled items.`}
          bars={[
            { lane: "system1", name: system1Name, value: formatPct(system1.correct, system1.scored), fraction: acc(system1) },
            { lane: "llm", name: llmName, value: formatPct(llm.correct, llm.scored), fraction: acc(llm) },
          ]}
        />
      </div>
      <TokenDetails system1={system1} llm={llm} system1Name={system1Name} llmName={llmName} />
    </section>
  );
}

function TokenDetails({
  system1,
  llm,
  system1Name,
  llmName,
}: {
  system1: LaneStats;
  llm: LaneStats;
  system1Name: string;
  llmName: string;
}) {
  const rows: { lane: LaneKind; name: string; s: LaneStats }[] = [
    { lane: "system1", name: system1Name, s: system1 },
    { lane: "llm", name: llmName, s: llm },
  ];
  return (
    <Collapsible>
      <CollapsibleTrigger asChild>
        <Button variant="ghost" size="sm" className="group text-muted-foreground">
          Token details
          <ChevronDown className="transition-transform group-data-[state=open]:rotate-180" />
        </Button>
      </CollapsibleTrigger>
      <CollapsibleContent>
        <table className="mt-1 w-full text-sm tabular-nums">
          <thead className="text-left text-muted-foreground">
            <tr className="border-b">
              {["Model", "Requests", "Tokens in", "Cached tokens read", "Tokens out", "Errors", "Total cost"].map(h => (
                <th key={h} className="px-3 py-2 font-normal first:pl-0">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map(({ lane, name, s }) => (
              <tr key={lane} className="border-b last:border-0">
                <td className="py-2 pr-3">
                  <span className="flex items-center gap-2">
                    <span className={cn("size-2 rounded-full", LANE_DOT[lane])} aria-hidden />
                    {name}
                  </span>
                </td>
                <td className="px-3">{formatInt(s.requests)}</td>
                <td className="px-3">{formatInt(s.input)}</td>
                <td className="px-3">{formatInt(s.cacheRead)}</td>
                <td className="px-3">{formatInt(s.output)}</td>
                <td className={cn("px-3", s.failures > 0 && "text-destructive")}>{formatInt(s.failures)}</td>
                <td className="px-3">{formatUsd(s.costUsd)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </CollapsibleContent>
    </Collapsible>
  );
}
