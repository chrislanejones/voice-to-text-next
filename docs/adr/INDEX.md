← Back to the [README](../../Readme.md)

# Architecture Decision Records

| # | Title | Status | Date |
|---|-------|--------|------|
| [001](001-history-external-store.md) | Dictation history lives in a module-level localStorage store read through useSyncExternalStore | superseded by 004 | 09-18-2026 |
| [002](002-dictation-session-restarts.md) | Each dictation runs through a DictationSession class that restarts the browser recognizer until the user stops | draft | 09-18-2026 |
| [003](003-replicate-backend-routes.md) | AI features run through Next.js route handlers that call Replicate's HTTP API with plain fetch | draft | 10-05-2026 |
| [004](004-broadsheet-portal-rebuild.md) | The UI is rebuilt on the Broadsheet design system, and notes become structured objects the user pins on purpose | draft | 10-05-2026 |
| [005](005-ai-owner-password.md) | AI features sit behind a single owner password with a signed-cookie session | draft | 10-05-2026 |
