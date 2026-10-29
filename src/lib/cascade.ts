import { isMainCorrect, type TaskDef } from "./tasks";
import type { LaneResult } from "./types";

type Ok = Extract<LaneResult, { ok: true }>;

export type CascadeRow = { itemId: string; system1?: LaneResult; llm?: LaneResult };

export type Strategy = { costUsd: number; correct: number; escalated: number };

export type CascadeSummary = {
  rows: number;
  system1Only: Strategy;
  llmOnly: Strategy;
  cascade: Strategy;
};

const empty = (): Strategy => ({ costUsd: 0, correct: 0, escalated: 0 });

export function summarizeCascade(task: TaskDef, rows: CascadeRow[], threshold: number): CascadeSummary {
  const summary: CascadeSummary = { rows: 0, system1Only: empty(), llmOnly: empty(), cascade: empty() };
  for (const row of rows) {
    if (!row.system1?.ok || !row.llm?.ok) continue;
    const gold = task.items.find(i => i.id === row.itemId)?.gold;
    if (!gold) continue;
    const system1: Ok = row.system1;
    const llm: Ok = row.llm;
    summary.rows += 1;

    summary.system1Only.costUsd += system1.costUsd;
    if (isMainCorrect(task, system1.answer, gold)) summary.system1Only.correct += 1;

    summary.llmOnly.costUsd += llm.costUsd;
    summary.llmOnly.escalated += 1;
    if (isMainCorrect(task, llm.answer, gold)) summary.llmOnly.correct += 1;

    const escalate = (system1.answer.mainConfidence ?? 0) < threshold;
    const chosen = escalate ? llm : system1;
    summary.cascade.costUsd += system1.costUsd + (escalate ? llm.costUsd : 0);
    if (escalate) summary.cascade.escalated += 1;
    if (isMainCorrect(task, chosen.answer, gold)) summary.cascade.correct += 1;
  }
  return summary;
}
