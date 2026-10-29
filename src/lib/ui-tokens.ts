import type { LaneKind, Tone } from "./types";

export const ROW_GRID =
  "grid grid-cols-[minmax(0,2.2fr)_minmax(0,0.7fr)_minmax(0,1.5fr)_minmax(0,1.5fr)] gap-4 px-4";

export const LANE_DOT: Record<LaneKind, string> = {
  system1: "bg-system1",
  llm: "bg-llm",
};

export const TONE_BADGE: Record<Tone, string> = {
  show: "border-emerald-500/30 bg-emerald-500/10 text-emerald-300",
  flag: "border-amber-500/30 bg-amber-500/10 text-amber-300",
  hide: "border-red-500/30 bg-red-500/10 text-red-300",
  info: "border-border bg-secondary text-foreground",
};
