# ADR-007: The UI becomes the Superdesign three-column VCE2TXT dashboard, replacing the Broadsheet look
Date: 2026-10-10   Status: accepted (2026-10-10)

## Context
ADR-004 rebuilt the app on Broadsheet: a serif, editorial board. Adding
article listening and saved-note editing gave one screen more tools than
that layout held. Chris approved Superdesign draft
`15913f7f-3ed4-4d1c-8184-e9e0a22604a5`, version 2, on 2026-10-08 and asked
to ship it (PRODUCT.md).

## Decision
Partially supersedes ADR-004: the visual direction only. The `Note` store,
key, deliberate pinning, and chat sources from ADR-004 are unchanged.
- `DictationApp` renders a three-column `.sd-shell` grid: saved notes on
  the left, recorder and `SavedNoteEditor` (edit, copy, export, read, remove
  a selected note) in the middle, and search plus listening tools on the
  right, with article listening above note listening.
- The app is named VCE2TXT (page title and manifest). Plus Jakarta Sans
  replaces Source Serif 4 through `next/font`. `app/dashboard.css` loads
  last and overrides Broadsheet's tokens with an indigo accent, a red second
  accent, and `sd-*` layout classes.
- `broadsheet.css` and `portal.css` are still imported underneath.
  Phosphor icons stay. No new dependencies.

## Consequences
+ Every tool is visible at once on desktop. A selected note gets a full
  editor instead of a dialog.
- Two design systems are layered: Broadsheet classes with dashboard token
  overrides. A Broadsheet class change can leak into the new look, and
  nobody owns cleaning up the unused Broadsheet rules.
- The fixed 384 px right column and 260-320 px left column squeeze the
  middle on narrow laptops. Phone layout rests on three media queries.
- Rebrand cost: the README, screenshots, and anything that says "Voice to
  Text" are now out of date.

## Alternatives rejected
Rationale reconstructed; the draft approval didn't record them.
- Keep Broadsheet and add the reader as another section: the tools end up
  stacked down one long page.
- Rewrite on a fresh design system with no Broadsheet base: more churn
  than one approved draft justified.

## Pre-mortem
It is six months later and this decision was a mistake. Most likely
reason: the layered CSS rotted. Three stylesheets fight over the same
classes, fixes go in as more `dashboard.css` overrides, and every visual
bug means tracing which file won. The three columns also suited the
desktop the draft was drawn for, while most real use was on a phone.
Early warning sign to watch for: `dashboard.css` growing past roughly
twice its 211 lines, or more `!important` rules joining the one it
already has.

---
← Back to the [README](../../Readme.md) · [ADR index](INDEX.md)
