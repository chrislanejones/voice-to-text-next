# ADR-006: Articles are fetched server-side behind an SSRF guard and read aloud by a Kokoro voice running in a browser worker
Date: 2026-10-10   Status: accepted (2026-10-10)

## Context
Chris wanted to paste an article link and listen to it, with no account and
no paid speech API (PRODUCT.md). Browsers can't fetch most article pages
cross-origin, so the server has to. A server that fetches any URL a user
types is an SSRF hole unless private addresses are blocked on every hop.
The browser's `speechSynthesis` voices vary a lot by device.

## Decision
Shipped in `4cd07a5` (first built in `a4214b3`).
- `POST /api/article` (Node runtime, 30 s max, 15 s fetch timeout, same-host
  `Origin` check) calls `fetchArticle` in `lib/article.ts`. It allows only
  http/https on ports 80/443, no credentials, no `localhost`/`.local`/etc.
  Every DNS answer must be public unicast (`ipaddr.js`), the checked address
  is pinned for the connection through an `undici` Agent, redirects are
  followed by hand (max 4) and re-checked, and HTML is capped at 2 MB.
- `jsdom` (no scripts, no subresources) plus `@mozilla/readability` extract
  the text. `jsdom` and `undici` are `serverExternalPackages`.
- Speech: `kokoro-js` on `@huggingface/transformers` runs
  `Kokoro-82M-v1.0-ONNX` (q8, wasm, one thread) in a module worker, five
  English voices. The model downloads from Hugging Face on first use and
  sits in the browser cache. `speechSynthesis` is the fallback and handles
  non-English articles.
- `scripts/build-speech.mjs` (esbuild, a new devDependency) bundles the
  worker and copies the ONNX runtime files into `public/speech/`
  (gitignored), so no executable code comes from a CDN. `dev` and `build`
  run it first.
- `public/sw.js` caches the app shell, `/_next/static/`, `/speech/`, and
  `/icons/` only; article and AI routes never enter the cache.
  `app/manifest.ts` adds a manifest with a share target. The worker
  registers in production only.

## Consequences
+ Listening is free, private (text never leaves the browser for speech),
  and works offline once the model and shell are cached.
+ The fetch path has tests (`pnpm test:reader`) for private IPs, redirects,
  and size limits.
- Six new runtime dependencies. `jsdom` and Transformers.js are heavy, and
  the first natural-voice play waits on a large model download.
- Every build depends on a generated `public/speech/`. Skip
  `pnpm speech:build` and the natural voice is missing with no build error.
- `/api/article` is public and unauthenticated. Anyone can use it as a
  fetch proxy for public pages, and nothing rate-limits it.

## Alternatives rejected
- Paid speech API (Replicate, as in ADR-003): costs money per article and
  needs the AI password, against "no paid speech API".
- Web Speech API only: no download, but voice quality depends on the
  device, and some browsers ship poor or no voices.

## Pre-mortem
It is six months later and this decision was a mistake. Most likely
reason: the hand-rolled SSRF guard missed a case (a DNS or IPv6 edge,
or a dependency upgrade that changed how `undici` uses the pinned
`lookup`), and the open proxy reached something it shouldn't. Or the
model download proved too heavy on phones and most plays fell back to
the browser voice anyway, leaving 1,000+ lockfile lines for a feature
few people used.
Early warning sign to watch for: a Transformers.js or `undici` major
bump, unexpected traffic on `/api/article` in Vercel logs, or fallback
messages showing up on most phone sessions.

## Amendment (2026-10-11)
`jsdom` is replaced by `linkedom`. jsdom 30 `require()`s the ES-module-only
`@exodus/bytes` from nine files, and Vercel's runtime rejected that with
`ERR_REQUIRE_ESM` on Node 22 and on Node 24, so every `/api/article` call
returned 500 in production. linkedom is ESM, parses without running scripts
or fetching resources, and works with Readability. The fetch now sends
standard browser headers, because news sites such as USA Today answer the
old custom user agent with 402 "Access Restricted". `engines.node` is
pinned to `24.x`.

---
← Back to the [README](../../Readme.md) · [ADR index](INDEX.md)
