import type { LaneResult, RunRequest } from "./types";

export const MAX_IN_FLIGHT_PER_LANE = 4;

export async function fetchLane(body: RunRequest): Promise<LaneResult> {
  try {
    const response = await fetch("/api/run", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    });
    return (await response.json()) as LaneResult;
  } catch {
    return { ok: false, error: "The demo server did not answer" };
  }
}

export function createPool(limit: number) {
  let active = 0;
  const queue: (() => Promise<void>)[] = [];
  const pump = () => {
    while (active < limit && queue.length) {
      const job = queue.shift()!;
      active += 1;
      job().finally(() => {
        active -= 1;
        pump();
      });
    }
  };
  return {
    add(job: () => Promise<void>) {
      queue.push(job);
      pump();
    },
    clear() {
      queue.length = 0;
    },
  };
}
