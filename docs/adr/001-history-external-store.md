# ADR-001: Dictation history lives in a module-level localStorage store read through useSyncExternalStore
Date: 2026-09-18   Status: draft

## Context
History (up to 10 strings under the localStorage key
`voice-to-text-history`) loaded and saved through `useState` + `useEffect`
in `DictationApp`. eslint-config-next 16.3.5 ships react-hooks v7, whose
`set-state-in-effect` rule flagged that as 3 errors and blocked the lint
gate. "Delete all" also needed a 100ms `setTimeout` re-clear hack. The `/`
page is statically prerendered, so the server render never sees
localStorage.

## Decision
`hooks/use-history.ts` holds the list in module scope behind `subscribe` /
`getSnapshot` / `getServerSnapshot` (the server snapshot is an empty array)
and exposes `useHistory()` returning `{ history, addEntry, removeEntry,
clear }`. A `storage` event listener keeps open tabs in step. The stored
shape is unchanged (a JSON array of strings), so there is no data
migration. Same pattern family as the module store in `hooks/use-toast.ts`.
Shipped in `528897f`.

## Consequences
+ Lint gate passes with no set-state-in-effect; the `setTimeout` hack is gone.
+ Open tabs stay in sync, with no new dependency.
- Module-level singleton: every consumer shares one list, and any future
  test must reset module state (there is no reset export yet).
- Hydration renders the empty server snapshot first, so history appears one
  render late (an empty first paint).
- If a localStorage write fails (quota, blocked storage), the in-memory list
  silently diverges from disk until reload.

## Alternatives rejected
- Lazy `useState` initializer reading localStorage: hydration mismatch on a
  prerendered page.
- zustand with `persist`: a new runtime dependency for 10 strings.

## Pre-mortem
It is six months later and this decision was a mistake. Most likely
reason: the persisted format has no version, and `load()` silently drops
anything that isn't a string. The first time an entry grows a field (a
timestamp, a title), entries become objects; an older open tab or a
rollback reads them, filters them all out, and its next save overwrites
the new data. History vanishes with no error. zustand's `persist` has a
`version` + `migrate` hook that would have forced the question; the
hand-rolled store lets it slide.
Early warning sign to watch for: a diff that changes the `string[]` type in
`hooks/use-history.ts` without adding a version key and a migration in
`load()`.
