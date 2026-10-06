# ADR-005: AI features sit behind a single owner password with a signed-cookie session
Date: 2026-10-05   Status: accepted (2026-10-06)

## Context
ADR-003 shipped the AI routes public with no auth: anyone with the URL could
spend the owner's Replicate credit. Asked who should be able to use AI,
Chris chose "Just me". This ADR addresses that ADR-003 consequence.

## Decision
- `AI_PASSWORD` env var sits alongside `REPLICATE_API_TOKEN`. `/api/ai/status`
  reports `configured` only when both are set; otherwise the UI hides AI.
  With no password set, no session can be valid, so `text`, `transcribe`,
  `speak`, and `chat` all return 401.
- `POST /api/ai/login` sets `vt_ai_session`: HttpOnly, SameSite=Strict,
  Path=/api/ai, Secure in production, 30 days. Value is
  `<expiry>.<HMAC-SHA256(expiry)>` keyed by the password itself, so changing
  the password signs everyone out. No server-side session store. Comparisons
  run HMAC digests through `timingSafeEqual` (`lib/ai-auth.ts`).
- Every AI route calls `requireSignIn` server-side, so calling a route
  directly doesn't skip the gate. Turning AI "On" while signed out opens
  `LoginDialog`; any 401 fires `AUTH_EXPIRED_EVENT` and the UI flips back to
  signed out.
- A wrong password waits 800 ms before answering.

## Consequences
+ Strangers can't spend the Replicate credit, with no new dependency and no
  database.
+ Revoking every session is one env var change.
- Brute force is only slowed per request. 800 ms doesn't stop parallel
  guessing, and nothing rate-limits `/api/ai/login`. A strong password is
  the real defense; a Vercel Firewall rate-limit rule on `/api/ai/login`
  is the follow-up.
- One shared secret, no per-user identity: no audit trail of who spent what,
  and no way to sign out one browser without signing out all of them.

## Alternatives rejected
- Real accounts with an allowlist (Clerk etc.): a provider and dependencies
  for one user.
- Open sign-up: anyone can spend the owner's credit.
- No gate: leaves the open-routes problem ADR-003 recorded.

## Pre-mortem
It is six months later and this decision was a mistake. Most likely
reason: the password was the whole defense and it wasn't strong enough.
Nothing rate-limits login, so a script running guesses in parallel ignores
the 800 ms delay, and the firewall rule stayed a follow-up. Or the app
gained a second user, the password got shared, and now there's no way to
cut one person off short of rotating it for everyone.
Early warning sign to watch for: a run of 401s from `/api/ai/login` in
Vercel logs, or the password being given to anyone other than Chris.

---
← Back to the [README](../../Readme.md) · [ADR index](INDEX.md)
