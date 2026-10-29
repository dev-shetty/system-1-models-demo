"use client";

import { useCallback, useMemo } from "react";
import { useStream } from "@/hooks/useStream";
import { fetchLane } from "@/lib/client";
import { isSystem1, MODEL_LABELS, SYSTEM1_LABELS } from "@/lib/pricing";
import { buildRunRequest } from "@/lib/questions";
import { computeStats, type Row } from "@/lib/stats";
import type { TaskDef } from "@/lib/tasks";
import type { DemoConfig } from "./Demo";
import { ModelSettings } from "./ModelSettings";
import { ResultsTable } from "./ResultsTable";
import { Scoreboard } from "./Scoreboard";
import { StreamControls } from "./StreamControls";

type Props = {
  task: TaskDef;
  config: DemoConfig;
  onConfigChange(patch: Partial<DemoConfig>): void;
  onReset(): void;
};

export function TaskView({ task, config, onConfigChange, onReset }: Props) {
  const { rows, status, start, pause, sendLive } = useStream({ task, ...config });
  const system1 = useMemo(() => computeStats(task, rows, "system1"), [task, rows]);
  const llm = useMemo(() => computeStats(task, rows, "llm"), [task, rows]);
  const llmName = MODEL_LABELS[config.model];
  const system1Name = SYSTEM1_LABELS[config.system1];

  const explain = useCallback(
    (row: Row) =>
      fetchLane(
        buildRunRequest({ task, model: config.model, state: row.input, mode: "reason" }),
      ),
    [task, config.model],
  );

  return (
    <>
      <section className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{task.title}</h1>
          <p className="mt-1 text-muted-foreground">{task.subtitle}</p>
        </div>
        <ModelSettings config={config} onChange={onConfigChange} joiner="vs" />
      </section>
      <Scoreboard system1={system1} llm={llm} system1Model={config.system1} llmName={llmName} />
      <div className="flex flex-col gap-3">
        <StreamControls
          task={task}
          status={status}
          sent={rows.filter(r => r.itemId).length}
          itemsPerSecond={config.itemsPerSecond}
          onStart={start}
          onPause={pause}
          onReset={onReset}
          onSpeedChange={itemsPerSecond => onConfigChange({ itemsPerSecond })}
          onSendLive={sendLive}
        />
        <ResultsTable
          task={task}
          rows={rows}
          system1Name={system1Name}
          llmName={llmName}
          compareHasProbabilities={isSystem1(config.model)}
          onExplain={isSystem1(config.model) ? undefined : explain}
        />
      </div>
    </>
  );
}
