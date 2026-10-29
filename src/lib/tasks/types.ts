import type { FieldSpec, Item, NormalizedAnswer, TaskId, Tone } from "../types";

export type Decision = { label: string; tone: Tone };

export type TaskDef = {
  id: TaskId;
  title: string;
  subtitle: string;
  context: string;
  mainField: string;
  fields: FieldSpec[];
  items: Item[];
  liveTemplate: string;
  liveInput(text: string): Record<string, unknown> | null;
  summary(input: Record<string, unknown>): { title: string; body: string };
  decision(answer: NormalizedAnswer): Decision;
};

export function splitFirstLine(text: string): [string, string] {
  const trimmed = text.trim();
  const newline = trimmed.indexOf("\n");
  if (newline === -1) return ["", trimmed];
  return [trimmed.slice(0, newline).trim(), trimmed.slice(newline + 1).trim()];
}
