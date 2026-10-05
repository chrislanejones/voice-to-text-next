# ADR-004: The UI is rebuilt on the Broadsheet design system, and notes become structured objects the user pins on purpose
Date: 2026-10-05   Status: draft

## Context
The Claude Design file "Voice to Text - Portal" redesigned the app on the
Broadsheet design system: a recorder that offers versions of a transcript, a
board of notes, and Ask your notes. Chris cut its scroll-hero section. Notes
needed a title, time, speakers, tags, and language, and ADR-001 stored only
plain strings. Chat answers had to link back to the notes they came from.

## Decision
Amends ADR-001: same `useSyncExternalStore` module store, new key and shape.
- `hooks/use-notes.ts` stores `Note {id, createdAt, title, text, speakers,
  tags, language?}` under `voice-to-text-notes`, max 10. On first load it
  migrates the `voice-to-text-history` strings one way, stamping them a
  minute apart. It reads the legacy key and never deletes it.
- Dictation no longer auto-saves. The user picks a version (Original /
  Cleaned up / Email / Bullets / Summary / Translate) and pins it.
- Broadsheet comes in as plain CSS classes and tokens copied into
  `app/broadsheet.css`, not the design system's JS bundle. Source Serif 4
  loads through `next/font`. Icons are `@phosphor-icons/react` duotone (new
  dependency). The app is light only: Broadsheet has no dark theme, so dark
  mode and the theme toggle are gone.
- Read aloud falls back to the browser's `speechSynthesis` when AI is off.
- `/api/ai/chat` returns `sources`: 0-based note indexes parsed from a
  trailing `SOURCES:` line, so answers link to notes.

## Consequences
+ The UI matches the design file. Notes carry enough data for titles, tags,
  speaker counts, and chat citations.
+ Rolling back to the old build loses no pre-migration notes. The legacy
  key is untouched.
- Notes pinned on this build don't exist for the old build. A rollback shows
  only the pre-migration strings.
- `.btn-primary` text is 3.65:1 against the accent, under WCAG AA's 4.5:1.
  The token belongs to the design system, so the fix starts there.
- lucide-react, framer-motion, next-themes, `components/ui/*`, and Tailwind
  are still installed but unused by the rendered UI. They're dead weight
  until someone removes them.
- Forgetting to pin loses the transcript. Nothing is saved by default.

## Alternatives rejected
- Import Broadsheet's JS bundle: a runtime dependency to get CSS classes.
- Keep `string[]` and derive titles: no place for tags, speakers, or language.

## Pre-mortem
It is six months later and this decision was a mistake. Most likely
reason: the new format still has no version field, which is the exact
warning sign ADR-001 named. `toNote()` fills gaps quietly. The next shape
change will be loose too: it will default fields that should have been
migrated and drop tags it doesn't recognize. And because the legacy key is
never deleted, anything that removes `voice-to-text-notes` outright (a
future reset that calls `removeItem`, or devtools) brings the old strings
back through migration. "Delete all" is safe today only because it writes
`[]` and leaves the key in place.
Early warning sign to watch for: a diff that changes `Note` without adding
a version key, or a bug report of deleted notes coming back.

---
← Back to the [README](../../Readme.md) · [ADR index](INDEX.md)
