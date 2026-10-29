import { z } from "zod";
import type { FieldValue, LlmMode, NormalizedAnswer, WireQuestion, WireQuestions } from "../../types";

function valueSchema(question: WireQuestion): z.ZodType {
  if (question.type === "choice") return z.enum(Object.keys(question.criteria) as [string, ...string[]]);
  return z.number();
}

export function outputSchema(questions: WireQuestions, mode: LlmMode) {
  const shape = Object.fromEntries(
    Object.entries(questions).map(([id, question]) => {
      const value = valueSchema(question);
      if (mode === "reason") return [id, z.object({ value, reason: z.string() })];
      return [id, value];
    }),
  );
  return z.object(shape);
}

function describeQuestion(id: string, question: WireQuestion): string {
  if (question.type === "choice") {
    return [
      `- ${id} (pick one label): ${question.instructions}`,
      ...Object.entries(question.criteria).map(([label, text]) => `  - ${label}: ${text}`),
    ].join("\n");
  }
  return [
    `- ${id} (a number from 0 to 1: the probability that the answer is yes): ${question.instructions}`,
    question.criteria?.true ? `  Yes means: ${question.criteria.true}` : "",
    question.criteria?.false ? `  No means: ${question.criteria.false}` : "",
  ]
    .filter(Boolean)
    .join("\n");
}

export function systemPrompt(context: string, questions: WireQuestions, mode: LlmMode): string {
  const reasonLine =
    mode === "reason"
      ? "For each field, return the value and a one-sentence reason for it."
      : "Return only the values. Do not explain.";
  return [
    context,
    "The user message is a JSON object. Answer every field below about it.",
    "Fields:",
    ...Object.entries(questions).map(([id, q]) => describeQuestion(id, q)),
    reasonLine,
  ].join("\n\n");
}

export function normalize(questions: WireQuestions, parsed: Record<string, unknown>, mode: LlmMode): NormalizedAnswer {
  const fields: Record<string, FieldValue> = {};
  for (const [id, question] of Object.entries(questions)) {
    const raw = parsed[id];
    const entry = mode === "reason" ? (raw as { value: unknown; reason: string }) : { value: raw };
    const reason = "reason" in entry ? String(entry.reason) : undefined;
    if (question.type === "noul") {
      const prob = Math.min(1, Math.max(0, Number(entry.value)));
      fields[id] = { value: prob >= 0.5, prob, reason };
    } else {
      fields[id] = { value: String(entry.value), reason };
    }
  }
  return { fields, mainConfidence: null };
}
