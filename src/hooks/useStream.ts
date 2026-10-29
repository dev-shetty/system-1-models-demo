"use client";

import { useCallback, useEffect, useReducer, useRef, useState } from "react";
import { createPool, fetchLane, MAX_IN_FLIGHT_PER_LANE } from "@/lib/client";
import type { Row } from "@/lib/stats";
import type { TaskDef } from "@/lib/tasks";
import { buildRunRequest } from "@/lib/questions";
import type { LaneKind, LaneResult, ModelId, System1Model } from "@/lib/types";

export type StreamStatus = "idle" | "running" | "paused" | "done";

const LANES: LaneKind[] = ["system1", "llm"];

type Action =
  | { type: "add"; row: Omit<Row, "results"> }
  | { type: "resolve"; lane: LaneKind; key: string; result: LaneResult };

function reducer(rows: Row[], action: Action): Row[] {
  switch (action.type) {
    case "add":
      return [{ ...action.row, results: { system1: null, llm: null } }, ...rows];
    case "resolve":
      return rows.map(r =>
        r.key === action.key ? { ...r, results: { ...r.results, [action.lane]: action.result } } : r,
      );
  }
}

type Options = {
  task: TaskDef;
  system1: System1Model;
  model: ModelId;
  itemsPerSecond: number;
};

export function useStream({ task, system1, model, itemsPerSecond }: Options) {
  const [rows, dispatch] = useReducer(reducer, []);
  const [status, setStatus] = useState<StreamStatus>("idle");
  const cursorRef = useRef(0);
  const liveCountRef = useRef(0);
  const [pools] = useState(() => ({
    system1: createPool(MAX_IN_FLIGHT_PER_LANE),
    llm: createPool(MAX_IN_FLIGHT_PER_LANE),
  }));

  const submit = useCallback(
    (itemId: string | null, input: Record<string, unknown>, key: string) => {
      dispatch({ type: "add", row: { key, itemId, input } });
      for (const lane of LANES) {
        const laneModel: Record<LaneKind, ModelId> = { system1, llm: model };
        const request = buildRunRequest({ task, model: laneModel[lane], state: input });
        pools[lane].add(async () => {
          const result = await fetchLane(request);
          dispatch({ type: "resolve", lane, key, result });
        });
      }
    },
    [task, system1, model, pools],
  );

  useEffect(() => {
    if (status !== "running") return;
    const id = setInterval(() => {
      const index = cursorRef.current;
      if (index >= task.items.length) {
        setStatus("done");
        return;
      }
      cursorRef.current = index + 1;
      const item = task.items[index];
      submit(item.id, item.input, item.id);
    }, 1000 / itemsPerSecond);
    return () => clearInterval(id);
  }, [status, itemsPerSecond, task.items, submit]);

  useEffect(
    () => () => {
      pools.system1.clear();
      pools.llm.clear();
    },
    [pools],
  );

  const sendLive = useCallback(
    (input: Record<string, unknown>) => {
      liveCountRef.current += 1;
      submit(null, input, `live-${liveCountRef.current}`);
    },
    [submit],
  );

  return {
    rows,
    status,
    start: () => setStatus("running"),
    pause: () => setStatus("paused"),
    sendLive,
  };
}
