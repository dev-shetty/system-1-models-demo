export type TaskId = "moderation" | "support";
export type ViewId = TaskId | "cascade";
// "system1" is the left lane and always holds a System 1 model. "llm" is the
// right lane, the comparison, which can hold any model.
export type LaneKind = "system1" | "llm";
export type System1Model = "laya" | "jev";
export type LlmModel = "claude-haiku-5-5" | "gemini-3.6-flash";
export type ModelId = System1Model | LlmModel;
export type LlmMode = "json" | "reason";
export type GoldValue = string | boolean;

export type FieldSpec =
  | { id: string; kind: "choice"; question: string; labels: Record<string, string> }
  | { id: string; kind: "noul"; question: string; whenTrue?: string; whenFalse?: string };

export type WireQuestion =
  | { type: "choice"; instructions: string; criteria: Record<string, string> }
  | { type: "noul"; instructions: string; criteria?: { true?: string; false?: string } };

export type WireQuestions = Record<string, WireQuestion>;

export type FieldValue = {
  value: GoldValue;
  prob?: number;
  probs?: Record<string, number>;
  reason?: string;
};

export type NormalizedAnswer = {
  fields: Record<string, FieldValue>;
  mainConfidence: number | null;
};

export type Usage = {
  input: number;
  output: number;
  cacheRead: number;
  cacheWrite: number;
};

export type LaneResult =
  | {
      ok: true;
      answer: NormalizedAnswer;
      usage: Usage;
      costUsd: number;
      latencyMs: number;
      model: string;
    }
  | { ok: false; error: string };

export type Item = {
  id: string;
  input: Record<string, unknown>;
  gold: Record<string, GoldValue>;
};

export type Tone = "show" | "flag" | "hide" | "info";

export type RunRequest = {
  task: TaskId;
  model: ModelId;
  mode?: LlmMode;
  state: Record<string, unknown>;
  questions: WireQuestions;
};
