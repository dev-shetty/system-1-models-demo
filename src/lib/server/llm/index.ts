import type { TaskDef } from "../../tasks";
import type { LaneResult, LlmMode, LlmModel, WireQuestions } from "../../types";
import { runClaude } from "./claude";
import { runGemini } from "./gemini";

export function runLlm(
  task: TaskDef,
  state: Record<string, unknown>,
  questions: WireQuestions,
  model: LlmModel,
  mode: LlmMode,
): Promise<LaneResult> {
  if (model === "gemini-3.6-flash") return runGemini(task, state, questions, mode);
  return runClaude(task, state, questions, mode);
}
