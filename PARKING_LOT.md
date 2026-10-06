# Parking lot

Found during the 09-18-2026 visual and accessibility pass. Out of scope there, so not fixed.

- ~~**Delete all has no confirmation or undo.**~~ Fixed 10-05-2026 by the redesign: Clear board asks first ("Clear board" / "Keep").
- ~~**Debug logs in `app/components/DictationButton.tsx`.**~~ Fixed 10-05-2026: the file is gone, and no `console.log` is left in `app/`, `hooks/`, or `lib/`.
- ~~**README is out of date.**~~ Fixed 10-05-2026: rewritten for the current app, with links to the ADRs.
- ~~**Copy always reports success.**~~ Fixed 10-05-2026: `copy` in `DictationApp.tsx` awaits the clipboard and says when the browser blocked it.
- ~~**Note colors shift on delete.**~~ Fixed 10-05-2026 (`5fa1490`): each note stores its color (`paper`) and keeps it. Six colors, and a new note never matches the five before it (ADR-004 amendment).
- ~~**Delete all is enabled with nothing to delete.**~~ Fixed 10-05-2026: Clear board is disabled on an empty board.
- ~~**Font weights.**~~ Gone 10-05-2026: Inter and the shadcn primitives were removed. `app/layout.tsx` now loads Source Serif 4 at 400 and 600.
- ~~**`CardDescription` in `app/components/ui/card.tsx`**~~ Gone 10-05-2026: `app/components/ui/` was deleted.
- **Turbopack root warning.** `next dev` warns about `/home/clj/package-lock.json` and suggests setting `turbopack.root` in `next.config.ts`.

Found during the 09-18-2026 dependency and recording work.

- **`.next/` build output is tracked in git.** `.gitignore` lists `node_modules`, `.env*`, and `.vercel`, but not `.next/`, and 149 files under `.next/` are still committed (checked 10-06-2026). Every `next dev` run dirties them. Fix: add `.next/` and `*.tsbuildinfo` to `.gitignore`, then `git rm -r --cached .next`.
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
- **Tailwind is still installed but unused by the UI.** The dead shadcn files and packages were removed 10-05-2026. `tailwindcss` and `@tailwindcss/postcss` are still dev dependencies. `app/globals.css` still holds the old Tailwind/shadcn theme, and Tailwind's base reset still styles buttons and inputs. Removing Tailwind needs a visual pass.
- **Old notes have made-up times.** Migrated notes get timestamps a minute apart, because the old store kept no dates.
- **Translate is a single language at a time.** Changing the language drops the cached translation.

Fixed by the redesign (from the 09-18-2026 list): struck through above.

Found while publishing on 10-05-2026.

- **AI calls stop at 55 seconds.** Vercel Hobby caps functions at 60 s, so long Whisper jobs (several minutes of audio) can time out with "The AI took too long." Fix: return the prediction id right away and have the browser poll a status route, or move to Vercel Pro. ADR-003 got a 10-06-2026 amendment with the 60 s / 55 s numbers.

Found during the 10-06-2026 docs audit.

- **AI controls show even when the server has no AI set up.** Since `7219e56` the AI tools switch, the dimmed controls, and Ask your notes render no matter what `/api/ai/status` says. On a server without `REPLICATE_API_TOKEN` and `AI_PASSWORD`, clicking them opens the sign-in box, which can only fail with "AI sign-in isn't set up on this server." Hide them when `configured` is false, or keep them and make the dialog say so up front.
