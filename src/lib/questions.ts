import { isSystem1 } from "./pricing";
import type { TaskDef } from "./tasks";
import type { FieldSpec, LlmMode, ModelId, RunRequest, WireQuestion, WireQuestions } from "./types";

function toWireQuestion(field: FieldSpec): WireQuestion {
  if (field.kind === "choice") return { type: "choice", instructions: field.question, criteria: field.labels };
  const criteria = {
    ...(field.whenTrue && { true: field.whenTrue }),
    ...(field.whenFalse && { false: field.whenFalse }),
  };
  if (Object.keys(criteria).length === 0) return { type: "noul", instructions: field.question };
  return { type: "noul", instructions: field.question, criteria };
}

export function toWireQuestions(fields: FieldSpec[]): WireQuestions {
  return Object.fromEntries(fields.map(f => [f.id, toWireQuestion(f)]));
}

type BuildOptions = {
  task: TaskDef;
  model: ModelId;
  state: Record<string, unknown>;
  mode?: LlmMode;
};

// The browser sends the full state and questions, so the request in the
// Network tab is exactly what both models are asked.
export function buildRunRequest({ task, model, state, mode }: BuildOptions): RunRequest {
  return {
    task: task.id,
    model,
    ...(!isSystem1(model) && { mode: mode ?? "json" }),
    state,
    questions: toWireQuestions(task.fields),
  };
}
