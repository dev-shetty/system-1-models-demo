# Laya talk demo

Live demo for the talk **AI that does not talk: Decision models for developers**.
Laya (an open-weight System 1 decision model, run locally) and one LLM (Claude Haiku 5.5 or
Gemini 3.6 Flash) get the same two Levels.fyi-style decision tasks: community moderation and
support routing. Counters show tokens, cost, latency, and accuracy for each side. Select a row to see
every answer, and to ask the LLM for its reasons (one extra call, with its own token cost).

- Design: `docs/superpowers/specs/2026-10-28-jev-talk-demo-design.md` (see the Laya change at the end)
- Build plan: `docs/superpowers/plans/2026-10-28-jev-talk-demo.md`

## Setup

1. Use Node 22 or newer, and Python 3.10 or newer.
2. Install and start Laya (about 2.3 GB of model files on the first run):

   ```bash
   python -m pip install "laya[serve]"
   LAYA_PRELOAD=1 LAYA_MODELS=typed-decisions laya-serve
   ```

   The server listens on http://localhost:8000. It uses CUDA, then Apple MPS, then the CPU.
3. Copy `.env.example` to `.env.local`, then add `ANTHROPIC_API_KEY` and `GEMINI_API_KEY`.
   For Jev, also add `TYPESAFE_API_KEY` (from the API keys page at console.typesafe.ai). The
   System 1 dropdown switches between Laya (local, free) and Jev (hosted, $0.042 per 1M input tokens).
   Set `GEMINI_RPM` to your free-tier limit from https://aistudio.google.com/rate-limit. The server
   spaces Gemini calls to stay under it, so the Gemini lane is slower to fill on the free tier.
4. Run `pnpm install`.
5. Run `pnpm build && pnpm start -p 3000`, then open http://localhost:3000.

`LAYA_MODEL` selects the checkpoint: `typed-decisions` (default, 1024-token context), `english`
(512 tokens), or `multilingual`.

## On stage

Every answer is a live call: Laya on `laya-serve`, and the LLM through its API. The app saves
nothing. If a call fails, its cell shows the error. The LLM lane needs internet access, and the
Laya lane needs `laya-serve` running on the same laptop.

The browser sends the full `state` and `questions` in every `/api/run` request, so you can show
the payload in the DevTools Network tab.

## Notes

- Laya has no API price, so its cost counter shows $0. The real cost is the laptop that runs it.
- Laya's README says its confidence is over-confident as shipped. In our test runs its confidence
  values were low (about 10–30%), so the cascade slider starts at 20%. Tune it before the talk.
- Laya's benchmark numbers come from its author. Our 120 sample items are the real test.
- Prices are in `src/lib/pricing.ts`, with the source and the date read.
- The sample data is synthetic. Review the gold labels in `src/data/*.json` before the talk.
