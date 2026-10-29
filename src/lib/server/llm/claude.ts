import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { costUsd } from "../../pricing";
import type { TaskDef } from "../../tasks";
import type { LaneResult, LlmMode, WireQuestions } from "../../types";
import { MissingKeyError } from "../errors";
import { normalize, outputSchema, systemPrompt } from "./prompt";

const MODEL = "claude-haiku-5-5";
const TIMEOUT_MS = 20_000;
const MAX_TOKENS: Record<LlmMode, number> = { json: 512, reason: 2048 };

let client: Anthropic | null = null;

function getClient(): Anthropic {
  if (!process.env.ANTHROPIC_API_KEY && !process.env.ANTHROPIC_AUTH_TOKEN) {
    throw new MissingKeyError("ANTHROPIC_API_KEY");
  }
  client ??= new Anthropic({ timeout: TIMEOUT_MS, maxRetries: 2 });
  return client;
}

export async function runClaude(
  task: TaskDef,
  state: Record<string, unknown>,
  questions: WireQuestions,
  mode: LlmMode,
): Promise<LaneResult> {
  const started = performance.now();
  const response = await getClient().messages.parse({
    model: MODEL,
    max_tokens: MAX_TOKENS[mode],
    system: [{ type: "text", text: systemPrompt(task.context, questions, mode), cache_control: { type: "ephemeral" } }],
    messages: [{ role: "user", content: JSON.stringify(state) }],
    thinking: { type: "disabled" },
    output_config: { effort: "low", format: zodOutputFormat(outputSchema(questions, mode)) },
  });
  const latencyMs = Math.round(performance.now() - started);
  if (response.stop_reason === "refusal") throw new Error("Claude refused this request");
  if (!response.parsed_output) throw new Error(`Claude returned no valid JSON (stop: ${response.stop_reason})`);
  const usage = {
    input: response.usage.input_tokens,
    output: response.usage.output_tokens,
    cacheRead: response.usage.cache_read_input_tokens ?? 0,
    cacheWrite: response.usage.cache_creation_input_tokens ?? 0,
  };
  return {
    ok: true,
    answer: normalize(questions, response.parsed_output as Record<string, unknown>, mode),
    usage,
    costUsd: costUsd(MODEL, usage),
    latencyMs,
    model: MODEL,
  };
}
