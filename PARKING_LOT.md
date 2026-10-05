# Parking lot

Found during the 09-18-2026 visual and accessibility pass. Out of scope there, so not fixed.

- **Delete all has no confirmation or undo.** One tap clears every saved note and the transcript. (Behavior, QC lane.)
- **Debug logs in `app/components/DictationButton.tsx`.** Three `console.log` calls (lines 21, 25, 30) fire on every start, stop, and state change.
- ~~**README is out of date.**~~ Fixed 10-05-2026: rewritten for the current app, with links to the ADRs.
- **Copy always reports success.** `navigator.clipboard.writeText` isn't awaited in `CardSection.tsx` or `Modal.tsx`, so "Copied" shows even when the write is blocked.
- **Note colors shift on delete.** Color comes from list position, so deleting one note recolors every note after it.
- **Delete all is enabled with nothing to delete.**
- **Font weights.** `app/layout.tsx` loads Inter at 400 and 700 only. `font-medium` and `font-semibold` in the shadcn primitives snap to those.
- **`CardDescription` in `app/components/ui/card.tsx`** uses `text-gray-400`, which fails contrast on the note colors. It's unused today.
- **Turbopack root warning.** `next dev` warns about `/home/clj/package-lock.json` and suggests setting `turbopack.root` in `next.config.ts`.

Found during the 09-18-2026 dependency and recording work.

- **`.next/` build output is tracked in git.** `.gitignore` lists only `node_modules`, and about 170 files under `.next/dev/` are committed. Every `next dev` run dirties them. Fix: add `.next/` and `*.tsbuildinfo` to `.gitignore`, then `git rm -r --cached .next`.
- **`next dev` writes `AGENTS.md` and `CLAUDE.md` at the repo root.** They're left uncommitted. Either commit them or set `agentRules: false` in `next.config.ts`.
- **pnpm skipped build scripts for `sharp` and `unrs-resolver`.** Local image optimization falls back to slower paths. Approve them with `pnpm approve-builds` if needed.
- **Android Chrome repeats earlier text in continuous results.** `DictationSession` doesn't de-duplicate it (see ADR-002).
- **Held-back majors (updated 10-05-2026):** eslint 10 (eslint-plugin-react, pulled in by eslint-config-next, crashes on it: `getFilename is not a function`) and TypeScript 7 (typescript-eslint doesn't support it yet). @types/node 26 is in. framer-motion and lucide-react were removed instead.

Found during the 10-05-2026 Replicate AI work (ADR-003).

- ~~**AI routes are open to anyone.**~~ Fixed 10-05-2026: every `/api/ai/*` route now needs the `AI_PASSWORD` session (ADR-005). Still open: password guesses are slowed (800 ms each) but not rate-limited, so add a Vercel Firewall rate-limit rule on `/api/ai/login` before a public deploy.
- **Not tested against real Replicate yet.** No token on this machine. Unverified: the Files API field name `content`, the whisper-diarization `segments` shape, and Kokoro returning a single URL.
- **Community models are unpinned.** `thomasmol/whisper-diarization` and `jaaari/kokoro-82m` run their latest version. Pin `owner/name:version` through the `REPLICATE_*_MODEL` env vars once tested.
- **No streaming.** Clean up and chat replies show up all at once. Revisit once the design is in.
- **Audio over 4.4 MB is rejected** (about 15 min of recording, often less for uploaded files). Large uploads would need direct-to-storage uploads.

Found during the 10-05-2026 Portal redesign (ADR-004).

- **Primary button text fails contrast.** Broadsheet's `.btn-primary` puts `--color-bg` on `--color-accent`: 3.65:1, under the 4.5:1 AA bar. It's the design system's token, so the fix belongs in the Claude Design project, then here.
- **Dark mode is gone.** Broadsheet has no dark theme. `next-themes` and the theme provider were removed 10-05-2026.
- **Tailwind is still installed but unused by the UI.** The dead shadcn files and packages were removed 10-05-2026. `app/globals.css` still holds the old Tailwind/shadcn theme, and Tailwind's base reset still styles buttons and inputs. Removing Tailwind needs a visual pass.
- **Old notes have made-up times.** Migrated notes get timestamps a minute apart, because the old store kept no dates.
- **Translate is a single language at a time.** Changing the language drops the cached translation.

Fixed by the redesign (from the 09-18-2026 list): Delete all now asks first ("Clear board" / "Keep") and is disabled when the board is empty. Copy waits for the clipboard and reports failure. Note colors follow the note, not its position. The `console.log` calls went away with `DictationButton.tsx`.

Found while publishing on 10-05-2026.

- **AI calls stop at 55 seconds.** Vercel Hobby caps functions at 60 s, so long Whisper jobs (several minutes of audio) can time out with "The AI took too long." Fix: return the prediction id right away and have the browser poll a status route, or move to Vercel Pro. ADR-003 still says 280 s / 300 s and needs that number updated.
