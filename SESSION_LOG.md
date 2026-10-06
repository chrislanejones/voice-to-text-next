# Session log — Replicate AI, Broadsheet redesign, password gate, publish

**Dates:** 10-05-2026 to 10-06-2026
**Branch:** `feat/replicate-ai` → PR #1, merged into `main`; later fixes pushed straight to `main`
**Live:** https://voice-to-text-next.vercel.app (Vercel production, AI configured)
**Scope:** add Replicate AI; implement the Claude Design "Voice to Text - Portal" file (minus its scroll hero); password-protect AI; Firefox popup; update packages; publish; sticky-note colors.

## Commits

| SHA | What |
|---|---|
| `2e3e0c4` | feat: Replicate AI tools + Broadsheet UI rebuild |
| `f8bbe7f` | docs: ADR-003, ADR-004, ADR-001 superseded |
| `8bc8ad2` | feat: AI password gate + Firefox popup |
| `401a3b6` | docs: README rewrite, ADR-005, ADR back-links |
| `cb17eae` | build: update all packages, drop unused UI deps |
| `c3f448e` | fix: fit AI routes in Vercel Hobby's 60 s limit |
| `0ed6edc` | chore: ignore `.vercel` |
| `c6c6e9f` | Merge PR #1 |
| `7219e56`…`197ea7c` | 4 commits from a parallel session: settings gear, shortcuts, sample notes, transcript pencil |
| `7d01228` | feat: edit pinned notes (parallel session's uncommitted work, gated and pushed here) |
| `5fa1490` | fix: neighboring sticky notes get different colors |

## What shipped

| Area | Result |
|---|---|
| AI via Replicate | Clean up / Email / Bullets / Summary / Translate (Llama 3 70B), Whisper + upload + speaker labels (whisper-diarization), read aloud (Kokoro), Ask your notes |
| Access | Page open to all; AI behind `AI_PASSWORD` (signed HttpOnly cookie, 30 days, every `/api/ai/*` route returns 401 without it) |
| UI | Broadsheet design, recorder with versions, board of pinned sticky notes, note dialog, light only |
| Notes | Structured, pinned on purpose, editable, 10 max, six distinct colors that never match a neighbor |
| Firefox | Mic opens a popup: use Chrome/Edge/Safari, or sign in for Whisper |
| Packages | Next 16.3.8, TypeScript 6, @types/node 26; 11 unused packages + dead shadcn files removed |

## Gates (final)

| Gate | Result |
|---|---|
| `tsc --noEmit` | **pass** |
| `eslint .` | **0 problems** |
| `next build` | **pass** |
| Vercel production deploy | **success** |
| Headless user tests (AI replies mocked) | **23/23**, then **10/10** (note editing), color checks **0 clashes** |
| Password gate via curl | 401 without session on all AI routes; forged cookie rejected |

## Decisions and why

- **Plain `fetch`, no `replicate` SDK** — two endpoints don't justify a dependency (ADR-003).
- **Owner password, not accounts** — Chris chose "just me"; protects the Replicate budget (ADR-005).
- **Hero banner cut** — Chris asked; the CMYK print filters went with it.
- **Dates on notes are MM-DD-YYYY**, overriding the design's "Oct 4" (house rule).
- **Held back eslint 10** (eslint-plugin-react crashes) **and TypeScript 7** (typescript-eslint unsupported).
- **AI deadline 55 s** — Vercel Hobby rejects `maxDuration` over 60 (first preview deploy failed on it).

## Skipped / not done

- **Live AI test (rows 2–8)** never ran against real Replicate: no AI requests reached production or the dev server. Unverified: Files API upload field, whisper-diarization output shape, Kokoro audio URL.
- **`/design-sync`** paused: this repo is an app, not a component library.
- **Rate limit on `/api/ai/login`** — only an 800 ms delay per guess.

## Next session

1. Run the 1–8 AI checklist on the live site while streaming `vercel logs --follow`; fix what breaks.
2. Firewall rate-limit rule on `/api/ai/login`.
3. Stop tracking `.next/` in git; consider removing Tailwind (needs a visual pass).
4. Long Whisper jobs: client-side polling to get past the 55 s cap.

---

# Session log — dictation fix, dependency refresh, and design pass

**Date:** 09-18-2026
**Branch:** `main` (5 commits, pushed)
**Scope:** clone and update; make recording better; make the site look good; fix the Next.js error; push.
**Live:** confirmed. voice-to-text-next.vercel.app serves the new build (the history heading is present).

## Commits

| SHA | What |
|---|---|
| `528897f` | fix: keep the whole transcript while dictating |
| `110fc8a` | build: update deps within majors and restore eslint on Next 16 |
| `132c94d` | fix: stop the hydration error caused by browser extensions |
| `e3c125c` | style: polish layout, contrast, and accessibility |
| `75be082` | docs: ADR-001, ADR-002, PARKING_LOT.md |

## Gates

| Gate | Before | After |
|---|---|---|
| `tsc --noEmit` | pass | **pass** |
| `pnpm lint` | **crashed** (`next lint` removed in Next 16; FlatCompat circular JSON) | **0 errors**, 1 warning in generated `use-toast.ts` |
| `pnpm build` | pass | **pass** |
| `pnpm audit --prod` | 48 (2 critical, 23 high) | **0** |

## Recording fixes (`SpeechRecognitionService.tsx`)

| Problem | Fix |
|---|---|
| Each new phrase **replaced** everything said before it | Transcript rebuilt from the whole results list plus text from earlier sessions |
| Chrome ends continuous sessions on its own (~60 s, network blip) | `DictationSession` restarts the recognizer until the user stops; stops after 3 restarts under 1 s |
| Words in progress lost at cut-off | Kept and committed |
| Raw error codes (`not-allowed`) | Plain-language messages; `no-speech` and `aborted` are quiet |
| Lowercase run-on text | Each finished phrase capitalized and ended with a period |
| 5 s silence stop cut people off | 8 s |
| Firefox error only after clicking | Detected up front; mic disabled with an explanation |
| History load/save in effects (3 lint errors) + `setTimeout` hack | `hooks/use-history.ts`: localStorage store via `useSyncExternalStore`, syncs across tabs |

Verified with 12 scenario checks against a fake recognizer in Node (scratch script, not committed): **12/12 pass**. Not tested with a real mic in this session.

## Design pass (Lacey)

| Check | Before | After |
|---|---|---|
| Lowest text contrast (375/768/1280 × light/dark) | **1.45:1** | **6.92:1** light, **5.56:1** dark |
| Transcript text, light | 2.35:1 | **16.28:1** |
| `dark:` variant | Followed the OS, ignored the toggle | Follows the toggle |
| Note buttons | 24px | **36px** |
| Headings | none | h1 + h2 |
| Pastel notes in sRGB | 2 of 9 | **9 of 9** |
| Reduced motion | ignored | respected |

Labels renamed (for any future tests): "Delete Card" → "Delete note", "Copy to clipboard" → "Copy note", "Open in modal" → "Open note", theme button → "Change theme".

## Held back (major versions)

eslint 10, @types/node 26, framer-motion 13, lucide-react 1.x.

## Left uncommitted

- `AGENTS.md`, `CLAUDE.md`: generated by `next dev` 16.3. Committing a CLAUDE.md changes how Claude behaves here, so that's Chris's call. The other option is `agentRules: false` in `next.config.ts`.
- `tsconfig.tsbuildinfo`: build output, not ignored.

## Next session

- Untrack `.next/` (about 170 build files are committed) and ignore `.next/` plus `*.tsbuildinfo`.
- Add a confirmation or undo to "Delete all".
- Test dictation with a real mic in Chrome, Edge, and Safari.
- The rest is in `PARKING_LOT.md`.
