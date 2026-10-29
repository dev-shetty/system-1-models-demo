import { NextResponse } from "next/server";
import { z } from "zod";
import { runLane } from "@/lib/server/run";

const MAX_BODY_CHARS = 20_000;

const WireQuestionSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("choice"),
    instructions: z.string(),
    criteria: z.record(z.string(), z.string()),
  }),
  z.object({
    type: z.literal("noul"),
    instructions: z.string(),
    criteria: z.object({ true: z.string().optional(), false: z.string().optional() }).optional(),
  }),
]);

const RunRequestSchema = z.object({
  task: z.enum(["moderation", "support"]),
  model: z.enum(["laya", "jev", "claude-haiku-5-5", "gemini-3.6-flash"]),
  mode: z.enum(["json", "reason"]).optional(),
  state: z.record(z.string(), z.unknown()),
  questions: z.record(z.string(), WireQuestionSchema),
});

function badRequest(error: string) {
  return NextResponse.json({ ok: false, error }, { status: 400 });
}

export async function POST(request: Request) {
  const text = await request.text();
  if (text.length > MAX_BODY_CHARS) return badRequest(`Request is larger than ${MAX_BODY_CHARS} characters`);
  let body: unknown;
  try {
    body = JSON.parse(text);
  } catch {
    return badRequest("Request is not valid JSON");
  }
  const parsed = RunRequestSchema.safeParse(body);
  if (!parsed.success) {
    const where = parsed.error.issues[0]?.path.join(".") || "body";
    return badRequest(`Bad request: check "${where}"`);
  }
  return NextResponse.json(await runLane(parsed.data));
}
