# ADR-003: AI features run through Next.js route handlers that call Replicate's HTTP API with plain fetch
Date: 2026-10-05   Status: draft

## Context
Until now the app had no backend: dictation used the browser Web Speech API
and history lived in localStorage. Cleanup, email, bullets, summary,
translate, chat, server transcription with speaker labels, and read-aloud
all need hosted models and a secret token, which can't be in the browser.

## Decision
Five route handlers under `app/api/ai/` (`status`, `text`, `transcribe`,
`speak`, `chat`, each `maxDuration = 300`) call Replicate through
`lib/replicate.ts`, using plain `fetch` and a server-only
`REPLICATE_API_TOKEN`. `POST /v1/predictions` with `Prefer: wait=60`, then
poll every 1.5s until 280s, then cancel. Models, each env-overridable:
`meta/meta-llama-3-70b-instruct` (all text tasks and chat),
`thomasmol/whisper-diarization` (transcription and speaker labels in one
model; labels are only formatting in `lib/transcript.ts`),
`jaaari/kokoro-82m` (read aloud). Audio is MediaRecorder Opus at 32 kbps,
capped at 15 minutes and 4.4 MB (under Vercel's 4.5 MB body limit),
uploaded to the Replicate Files API and passed to the model as a URL.
"Ask your notes" puts all notes (at most 10) into the prompt; no
embeddings or vector store. AI is opt-in per browser (localStorage
`voice-to-text-ai`) and hidden entirely when `/api/ai/status` reports no
token; the header copy changes when it's on.

## Consequences
+ No new dependency; the whole Replicate surface is one ~140-line file.
+ The token never leaves the server, and models swap by env var.
- The routes are public with no auth or rate limit: anyone with the URL
  can spend the Replicate budget.
- Models run as "owner/name" (latest version, unpinned), so an upstream
  change to inputs or outputs breaks a feature with no deploy on our side.
- Unverified until a live test: the Files API form field name `content`
  was written from memory. `replicate.delivery` audio URLs expire after
  about an hour.

## Alternatives rejected
- `replicate` npm SDK: a dependency for two endpoints.
- Vercel AI Gateway: Chris asked for Replicate, and the Gateway has no
  Whisper diarization or Kokoro.
- Calling Replicate from the browser: leaks the token.
- Streaming responses: deferred until the UI design is settled.

## Pre-mortem
It is six months later and this decision was a mistake. Most likely
reason: the first backend shipped as open, unmetered proxies to a paid
API. A link gets shared or scraped, a script loops `/api/ai/transcribe`
with 4.4 MB clips, and the Replicate bill or a revoked token is how we
find out. Unpinned community models make it worse: one silent upstream
change breaks transcription, and with no tests or telemetry on the
routes, it looks like a user error until someone checks the logs.
Early warning sign to watch for: Replicate spend or prediction count
rising faster than the number of people actually using the app, or the
first `console.error("Replicate prediction"...)` line in Vercel logs
nobody can tie to a real session.

---
← Back to the [README](../../Readme.md) · [ADR index](INDEX.md)
