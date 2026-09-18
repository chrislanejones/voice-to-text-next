# ADR-002: Each dictation runs through a DictationSession class that restarts the browser recognizer until the user stops
Date: 2026-09-18   Status: draft

## Context
Chrome ends continuous Web Speech recognition on its own (about a minute
in, or after a network blip), so recording silently stopped mid-dictation.
The old result handler also replaced the transcript with only the newest
phrase on every result, so everything before the last phrase was lost.

## Decision
A plain TS class in `app/components/SpeechRecognitionService.tsx` (no
React) owns one user dictation. It creates a fresh `SpeechRecognition` per
browser session and restarts on `end` until the user stops, the 8s silence
timer fires, any error other than `no-speech` / `aborted` hits
(`not-allowed`, `audio-capture`, `network`, ...), or 3 sessions in a row
end in under 1s. The transcript is rebuilt from the whole results list plus
text committed by earlier sessions; in-progress words are kept on cut-off.
`formatSegment` capitalizes each finished phrase and ends it with a period.
`useSpeechRecognition(onSessionEnd)` wraps the class, and the history save
runs in that callback, not an effect. Shipped in `528897f`.

## Consequences
+ Dictations past a minute keep going, and the whole transcript survives.
+ Session logic has no React in it, so it can be tested with a fake
  recognizer.
- Each restart seam can miss roughly 100-300ms of audio (estimated, not
  measured).
- Heuristic transcript: auto periods land mid-sentence when Chrome
  finalizes at a short pause (and get saved to history), and Android
  Chrome's known repeating of earlier text in continuous results is not
  de-duplicated.
- Still the Web Speech API: Chrome sends the audio to Google's servers
  (unchanged from before, recorded so it isn't forgotten).

## Alternatives rejected
- One recognizer created in an effect with listeners re-attached (the old
  approach): stale-instance bugs and an `InvalidStateError` retry dance.
- A cloud speech-to-text API (Whisper, Deepgram, ...): needs a server
  route, an API key, per-minute cost, and uploading audio.

## Pre-mortem
It is six months later and this decision was a mistake. Most likely
reason: the restart loop papers over a loosely specified browser API
instead of owning the audio. Session limits, error codes, and result lists
differ across Chrome, Android Chrome, Safari, and versions of each, and
every quirk (seam gaps, repeated text, stray periods) earns another
heuristic in `DictationSession`. The failures are silent (a dropped or
doubled phrase looks like the user misspoke) and there are no tests or
telemetry, so quality erodes unnoticed until the cloud API rejected here
gets built anyway, after months of patching.
Early warning sign to watch for: the first user-agent or platform check
added inside `DictationSession` to handle one browser's quirk.
