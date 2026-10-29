import type { FieldValue, GoldValue, NormalizedAnswer, TaskId } from "../types";
import { moderation } from "./moderation";
import { support } from "./support";
import type { TaskDef } from "./types";

export type { TaskDef } from "./types";

export const TASKS: Record<TaskId, TaskDef> = { moderation, support };
export const TASK_ORDER: TaskId[] = ["moderation", "support"];

export function isCorrect(answer: FieldValue | undefined, gold: GoldValue | undefined): boolean {
  return answer !== undefined && answer.value === gold;
}

export function isMainCorrect(task: TaskDef, answer: NormalizedAnswer, gold: Record<string, GoldValue>): boolean {
  return isCorrect(answer.fields[task.mainField], gold[task.mainField]);
}

export function findItem(task: TaskDef, itemId: string) {
  return task.items.find(i => i.id === itemId);
}
