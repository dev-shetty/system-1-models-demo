import type { LlmModel, ModelId, System1Model, Usage } from "./types";

type Price = {
  inputPerM: number;
  outputPerM: number;
  cacheWritePerM: number;
  cacheReadPerM: number;
  source: string;
  readOn: string;
};

const ANTHROPIC_SOURCE = "Claude API skill pricing table (cached 2026-10-06)";

export const PRICES: Record<string, Price> = {
  laya: {
    inputPerM: 0,
    outputPerM: 0,
    cacheWritePerM: 0,
    cacheReadPerM: 0,
    source: "https://github.com/NandhaKishorM/laya (Apache-2.0, self-hosted, no API price)",
    readOn: "2026-10-28",
  },
  jev: {
    inputPerM: 0.042,
    outputPerM: 0,
    cacheWritePerM: 0,
    cacheReadPerM: 0,
    source: "https://docs.typesafe.ai/models.md (Jev 1.14, output tokens free)",
    readOn: "2026-10-28",
  },
  "claude-haiku-5-5": {
    inputPerM: 0.1,
    outputPerM: 0.5,
    cacheWritePerM: 0.125,
    cacheReadPerM: 0.01,
    source: ANTHROPIC_SOURCE,
    readOn: "2026-10-28",
  },
  // Paid Standard tier. The free tier costs $0 but has low rate limits, so the
  // demo shows what the same traffic costs at scale. 3.6 Flash is listed at the
  // 3.8 Flash price until 2026-12-31; from 2027-01-01 it doubles ($1.50 / $7.50).
  "gemini-3.6-flash": {
    inputPerM: 0.75,
    outputPerM: 3.75,
    cacheWritePerM: 0,
    cacheReadPerM: 0.075,
    source: "https://ai.google.dev/gemini-api/docs/pricing (output includes thinking tokens)",
    readOn: "2026-10-29",
  },
};

export const SYSTEM1_LABELS: Record<System1Model, string> = {
  laya: "Laya",
  jev: "Jev",
};

export const LLM_LABELS: Record<LlmModel, string> = {
  "claude-haiku-5-5": "Claude Haiku 5.5",
  "gemini-3.6-flash": "Gemini 3.6 Flash",
};

export const MODEL_LABELS: Record<ModelId, string> = { ...SYSTEM1_LABELS, ...LLM_LABELS };

export function isSystem1(model: ModelId): model is System1Model {
  return model in SYSTEM1_LABELS;
}

export function costUsd(model: string, usage: Usage): number {
  const price = PRICES[model];
  if (!price) return 0;
  return (
    (usage.input * price.inputPerM +
      usage.output * price.outputPerM +
      usage.cacheWrite * price.cacheWritePerM +
      usage.cacheRead * price.cacheReadPerM) /
    1_000_000
  );
}
