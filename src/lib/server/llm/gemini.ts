import { ApiError, GoogleGenAI, ThinkingLevel } from "@google/genai";
import { z } from "zod";
import { costUsd } from "../../pricing";
import type { TaskDef } from "../../tasks";
import type { LaneResult, LlmMode, WireQuestions } from "../../types";
import { MissingKeyError } from "../errors";
import { normalize, outputSchema, systemPrompt } from "./prompt";

const MODEL = "gemini-3.6-flash";
const TIMEOUT_MS = 20_000;
// `low` is the lowest thinking level that the 3.x Flash models document. Thinking
// tokens count against maxOutputTokens, so these caps are higher than Claude's.
const THINKING = ThinkingLevel.LOW;
const MAX_TOKENS: Record<LlmMode, number> = { json: 2048, reason: 4096 };
const RETRY_DELAYS_MS = [1000, 2000];
const RETRYABLE = new Set([500, 503]);
const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

let client: GoogleGenAI | null = null;
let nextSlotAt = 0;

function getClient(): GoogleGenAI {
  if (!process.env.GEMINI_API_KEY) throw new MissingKeyError("GEMINI_API_KEY");
  client ??= new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  return client;
}

// The free tier allows only a few requests per minute, so calls are spaced out
// instead of failing with 429. Queue time is not counted as latency.
async function waitForSlot(): Promise<void> {
  const intervalMs = 60_000 / Number(process.env.GEMINI_RPM ?? 10);
  const now = Date.now();
  const startAt = Math.max(now, nextSlotAt);
  nextSlotAt = startAt + intervalMs;
  if (startAt > now) await sleep(startAt - now);
}

function jsonSchemaFor(schema: z.ZodType): object {
  const jsonSchema = { ...(z.toJSONSchema(schema) as Record<string, unknown>) };
  delete jsonSchema.$schema;
  return jsonSchema;
}

type GenerateParams = Parameters<GoogleGenAI["models"]["generateContent"]>[0];

// Overload errors (503) are usually short spikes, so a retry often succeeds.
// Only the successful attempt counts as latency.
async function generateWithRetry(ai: GoogleGenAI, params: GenerateParams) {
  for (let attempt = 0; ; attempt++) {
    await waitForSlot();
    const started = performance.now();
    try {
      const response = await ai.models.generateContent(params);
      return { response, latencyMs: Math.round(performance.now() - started) };
    } catch (error) {
      if (!(error instanceof ApiError)) throw error;
      if (error.status === 429) throw new Error("Gemini rate limit reached (429). Lower GEMINI_RPM or wait a minute.");
      if (!RETRYABLE.has(error.status)) throw error;
      if (attempt >= RETRY_DELAYS_MS.length) {
        throw new Error(`Gemini is overloaded (${error.status}) after ${attempt + 1} tries. Try again soon.`);
      }
      await sleep(RETRY_DELAYS_MS[attempt]);
    }
  }
}

export async function runGemini(
  task: TaskDef,
  state: Record<string, unknown>,
  questions: WireQuestions,
  mode: LlmMode,
): Promise<LaneResult> {
  const ai = getClient();
  const schema = outputSchema(questions, mode);
  const { response, latencyMs } = await generateWithRetry(ai, {
    model: MODEL,
    contents: JSON.stringify(state),
    config: {
      systemInstruction: systemPrompt(task.context, questions, mode),
      responseMimeType: "application/json",
      responseJsonSchema: jsonSchemaFor(schema),
      thinkingConfig: { thinkingLevel: THINKING },
      maxOutputTokens: MAX_TOKENS[mode],
      httpOptions: { timeout: TIMEOUT_MS },
    },
  });
  const parsed = schema.safeParse(JSON.parse(response.text ?? "null"));
  if (!parsed.success) throw new Error("Gemini returned JSON that does not match the schema");
  const meta = response.usageMetadata;
  const cached = meta?.cachedContentTokenCount ?? 0;
  const usage = {
    input: (meta?.promptTokenCount ?? 0) - cached,
    output: (meta?.candidatesTokenCount ?? 0) + (meta?.thoughtsTokenCount ?? 0),
    cacheRead: cached,
    cacheWrite: 0,
  };
  return {
    ok: true,
    answer: normalize(questions, parsed.data as Record<string, unknown>, mode),
    usage,
    costUsd: costUsd(MODEL, usage),
    latencyMs,
    model: MODEL,
  };
}
