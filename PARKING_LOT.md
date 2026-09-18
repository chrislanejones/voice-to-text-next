# Parking lot

Found during the 09-18-2026 visual and accessibility pass. Out of scope there, so not fixed.

- **Delete all has no confirmation or undo.** One tap clears every saved note and the transcript. (Behavior, QC lane.)
- **Debug logs in `app/components/DictationButton.tsx`.** Three `console.log` calls (lines 21, 25, 30) fire on every start, stop, and state change.
- **README is out of date.** `Readme.md` line 21 says Next.js 14. The app is on Next 16.
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
- **Held-back majors:** eslint 10, @types/node 26, framer-motion 13, lucide-react 1.x.
