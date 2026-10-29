import {
  APIConnectionError,
  APITimeoutError,
  TypeSafeClient,
  type ChoiceResponse,
  type EntryType,
  type NoulResponse,
  type Questions,
} from "@typesafe-ai/sdk";
import { costUsd, SYSTEM1_LABELS } from "../pricing";
import type { TaskDef } from "../tasks";
import type { FieldValue, LaneResult, NormalizedAnswer, System1Model, WireQuestion, WireQuestions } from "../types";
import { MissingKeyError } from "./errors";

const TIMEOUT_MS = 15_000;
const LAYA_BASE_URL = process.env.LAYA_BASE_URL ?? "http://localhost:8000";

type Answer = ChoiceResponse | NoulResponse;

// Laya and Jev speak the same /v1/systemone protocol, so one TypeSafe client
// type serves both. Laya needs no key, but the SDK requires one, and laya-serve
// does not document zstd request bodies, so compression is off for it.
function createClient(model: System1Model): TypeSafeClient {
  if (model === "laya") {
    return new TypeSafeClient({
      baseURL: LAYA_BASE_URL,
      apiKey: process.env.LAYA_API_KEY ?? "local",
      defaultModel: process.env.LAYA_MODEL ?? "typed-decisions",
      compression: false,
      timeout: TIMEOUT_MS,
    });
  }
  if (!process.env.TYPESAFE_API_KEY) throw new MissingKeyError("TYPESAFE_API_KEY");
  return new TypeSafeClient({ defaultModel: "jev-latest", timeout: TIMEOUT_MS });
}

const clients = new Map<System1Model, TypeSafeClient>();

function getClient(model: System1Model): TypeSafeClient {
  const existing = clients.get(model);
  if (existing) return existing;
  const created = createClient(model);
  clients.set(model, created);
  return created;
}

function connectionError(model: System1Model): Error {
  if (model === "laya") return new Error(`Laya is not running at ${LAYA_BASE_URL}. Start laya-serve.`);
  return new Error("Jev could not be reached. Check the internet connection.");
}

function normalizeField(
  name: string,
  id: string,
  question: WireQuestion,
  answer: Answer | undefined,
): { value: FieldValue; confidence: number | null } {
  if (!answer) throw new Error(`${name} returned no answer for "${id}"`);
  if (question.type === "noul" && answer.type === "noul") {
    return { value: { value: answer.noul >= 0.5, prob: answer.noul }, confidence: null };
  }
  if (question.type === "choice" && answer.type === "choice") {
    const probs = answer.probabilities as Record<string, number>;
    return { value: { value: answer.choice, prob: probs[answer.choice], probs }, confidence: answer.confidence };
  }
  throw new Error(`${name} returned a ${answer.type} answer for the ${question.type} question "${id}"`);
}

function normalize(
  name: string,
  task: TaskDef,
  questions: WireQuestions,
  answers: Record<string, Answer>,
): NormalizedAnswer {
  const fields: Record<string, FieldValue> = {};
  let mainConfidence: number | null = null;
  for (const [id, question] of Object.entries(questions)) {
    const { value, confidence } = normalizeField(name, id, question, answers[id]);
    fields[id] = value;
    if (id === task.mainField) mainConfidence = confidence;
  }
  return { fields, mainConfidence };
}

export async function runSystem1(
  task: TaskDef,
  state: Record<string, unknown>,
  questions: WireQuestions,
  model: System1Model,
): Promise<LaneResult> {
  const name = SYSTEM1_LABELS[model];
  const client = getClient(model);
  const started = performance.now();
  const response = await client
    .systemOne({ state: state as NonNullable<EntryType>, questions: questions as Questions })
    .catch((error: unknown) => {
      if (error instanceof APITimeoutError) throw new Error(`${name} did not answer within ${TIMEOUT_MS / 1000} s`);
      if (error instanceof APIConnectionError) throw connectionError(model);
      throw error;
    });
  const latencyMs = Math.round(performance.now() - started);
  const usage = {
    input: response.usage.input_tokens ?? 0,
    output: response.usage.output_tokens ?? 0,
    cacheRead: 0,
    cacheWrite: 0,
  };
  return {
    ok: true,
    answer: normalize(name, task, questions, response.answers as Record<string, Answer>),
    usage,
    costUsd: costUsd(model, usage),
    latencyMs,
    model: response.model,
  };
}
