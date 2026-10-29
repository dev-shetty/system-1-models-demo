import { isSystem1 } from "../pricing";
import { TASKS, type TaskDef } from "../tasks";
import type { LaneResult, RunRequest } from "../types";
import { describeError } from "./errors";
import { runLlm } from "./llm";
import { runSystem1 } from "./system1";

function callLive(task: TaskDef, req: RunRequest): Promise<LaneResult> {
  if (isSystem1(req.model)) return runSystem1(task, req.state, req.questions, req.model);
  return runLlm(task, req.state, req.questions, req.model, req.mode ?? "json");
}

export async function runLane(req: RunRequest): Promise<LaneResult> {
  const task = TASKS[req.task];
  if (!req.questions[task.mainField]) {
    return { ok: false, error: `The questions must include "${task.mainField}"` };
  }
  try {
    return await callLive(task, req);
  } catch (error) {
    return { ok: false, error: describeError(error) };
  }
}
