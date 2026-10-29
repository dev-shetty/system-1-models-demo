"use client";

import { Download } from "lucide-react";
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { summarizeCascade, type CascadeRow } from "@/lib/cascade";
import { createPool, fetchLane, MAX_IN_FLIGHT_PER_LANE } from "@/lib/client";
import { MODEL_LABELS, SYSTEM1_LABELS } from "@/lib/pricing";
import { buildRunRequest } from "@/lib/questions";
import { TASK_ORDER, TASKS } from "@/lib/tasks";
import type { LaneKind, TaskId } from "@/lib/types";
import { CascadeBoard } from "./CascadeBoard";
import { CascadeTotals } from "./CascadeTotals";
import type { DemoConfig } from "./Demo";
import { ModelSettings } from "./ModelSettings";

const LANES: LaneKind[] = ["system1", "llm"];

type RowsByTaskAndModel = Record<string, Record<string, CascadeRow>>;

type Props = { config: DemoConfig; onConfigChange(patch: Partial<DemoConfig>): void };

export function CascadeView({ config, onConfigChange }: Props) {
  const [taskId, setTaskId] = useState<TaskId>("moderation");
  const [rows, setRows] = useState<RowsByTaskAndModel>({});
  const [threshold, setThreshold] = useState(0.2);
  const [pool] = useState(() => createPool(MAX_IN_FLIGHT_PER_LANE * 2));
  const task = TASKS[taskId];
  const llmName = MODEL_LABELS[config.model];
  const system1Name = SYSTEM1_LABELS[config.system1];
  const rowKey = `${taskId}|${config.system1}|${config.model}`;
  const taskRows = useMemo(() => Object.values(rows[rowKey] ?? {}), [rows, rowKey]);
  const summary = useMemo(() => summarizeCascade(task, taskRows, threshold), [task, taskRows, threshold]);
  const fetched = taskRows.filter(r => r.system1 && r.llm).length;
  const percent = Math.round(threshold * 100);

  const load = () => {
    for (const item of task.items) {
      for (const lane of LANES) {
        pool.add(async () => {
          const result = await fetchLane(
            buildRunRequest({ task, model: lane === "system1" ? config.system1 : config.model, state: item.input }),
          );
          setRows(prev => {
            const forKey = prev[rowKey] ?? {};
            const row = forKey[item.id] ?? { itemId: item.id };
            return { ...prev, [rowKey]: { ...forKey, [item.id]: { ...row, [lane]: result } } };
          });
        });
      }
    }
  };

  return (
    <>
      <section className="flex flex-col gap-4">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div className="max-w-2xl">
            <h1 className="text-2xl font-semibold tracking-tight">System 2 is lazy</h1>
            <p className="mt-1 text-muted-foreground">
              {system1Name} answers every item first. When {system1Name} is less than {percent}% sure, the item also goes to {llmName},
              and that answer wins. You pay for the LLM only on the hard items.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Select value={taskId} onValueChange={v => setTaskId(v as TaskId)}>
              <SelectTrigger className="w-auto" aria-label="Task">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {TASK_ORDER.map(id => (
                  <SelectItem key={id} value={id}>
                    {TASKS[id].title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <ModelSettings config={config} onChange={onConfigChange} joiner="then" />
            <Button onClick={load}>
              <Download /> Load answers
            </Button>
          </div>
        </div>
        <p className="text-sm tabular-nums text-muted-foreground">
          {summary.rows} of {task.items.length} items have both answers
          {fetched > summary.rows && `. ${fetched - summary.rows} items have an error.`}
        </p>
      </section>

      <section className="flex flex-col gap-3 rounded-xl border p-5">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <label htmlFor="threshold" className="text-sm font-medium">
            Send an item to {llmName} when {system1Name} is less than {percent}% sure
          </label>
          <span className="text-sm tabular-nums text-muted-foreground">
            {summary.rows ? `${summary.cascade.escalated} of ${summary.rows} items go to ${llmName}` : "No answers loaded yet"}
          </span>
        </div>
        <Slider
          id="threshold"
          min={0}
          max={100}
          step={1}
          value={[percent]}
          onValueChange={([v]) => setThreshold(v / 100)}
        />
      </section>

      <CascadeTotals summary={summary} system1Name={system1Name} llmName={llmName} />
      <CascadeBoard task={task} rows={taskRows} threshold={threshold} system1Name={system1Name} llmName={llmName} />
    </>
  );
}
