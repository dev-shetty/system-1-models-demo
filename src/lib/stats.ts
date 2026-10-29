import { findItem, isMainCorrect, type TaskDef } from "./tasks";
import type { LaneKind, LaneResult } from "./types";

export type Row = {
  key: string;
  itemId: string | null;
  input: Record<string, unknown>;
  results: Record<LaneKind, LaneResult | null>;
};

export type LaneStats = {
  requests: number;
  failures: number;
  input: number;
  output: number;
  cacheRead: number;
  costUsd: number;
  p50Ms: number | null;
  correct: number;
  scored: number;
  costPerRequest: number | null;
};

export function median(values: number[]): number | null {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

export function computeStats(task: TaskDef, rows: Row[], lane: LaneKind): LaneStats {
  const stats: LaneStats = {
    requests: 0,
    failures: 0,
    input: 0,
    output: 0,
    cacheRead: 0,
    costUsd: 0,
    p50Ms: null,
    correct: 0,
    scored: 0,
    costPerRequest: null,
  };
  const latencies: number[] = [];
  for (const row of rows) {
    const result = row.results[lane];
    if (!result) continue;
    if (!result.ok) {
      stats.failures += 1;
      continue;
    }
    stats.requests += 1;
    stats.input += result.usage.input + result.usage.cacheWrite;
    stats.cacheRead += result.usage.cacheRead;
    stats.output += result.usage.output;
    stats.costUsd += result.costUsd;
    latencies.push(result.latencyMs);
    const item = row.itemId ? findItem(task, row.itemId) : undefined;
    if (!item) continue;
    stats.scored += 1;
    if (isMainCorrect(task, result.answer, item.gold)) stats.correct += 1;
  }
  stats.p50Ms = median(latencies);
  stats.costPerRequest = stats.requests ? stats.costUsd / stats.requests : null;
  return stats;
}
