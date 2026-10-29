"use client";

import { useState } from "react";
import { TASKS } from "@/lib/tasks";
import type { ModelId, System1Model, ViewId } from "@/lib/types";
import { AppHeader } from "./AppHeader";
import { CascadeView } from "./CascadeView";
import { TaskView } from "./TaskView";

export type DemoConfig = {
  view: ViewId;
  system1: System1Model;
  model: ModelId;
  itemsPerSecond: number;
};

export function Demo() {
  const [config, setConfig] = useState<DemoConfig>({
    view: "moderation",
    system1: "laya",
    model: "claude-haiku-5-5",
    itemsPerSecond: 1,
  });
  const [resetCount, setResetCount] = useState(0);
  const update = (patch: Partial<DemoConfig>) => setConfig(c => ({ ...c, ...patch }));

  const runKey = [config.view, config.system1, config.model, resetCount].join("|");

  return (
    <div className="flex min-h-svh flex-col">
      <AppHeader config={config} onChange={update} />
      <main className="mx-auto flex w-full max-w-[1440px] flex-1 flex-col gap-6 px-4 py-6 sm:px-6 lg:px-10">
        {config.view === "cascade" ? (
          <CascadeView key={resetCount} config={config} onConfigChange={update} />
        ) : (
          <TaskView
            key={runKey}
            task={TASKS[config.view]}
            config={config}
            onConfigChange={update}
            onReset={() => setResetCount(n => n + 1)}
          />
        )}
      </main>
    </div>
  );
}
