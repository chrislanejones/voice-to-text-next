"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  BrowserIcon,
  CopyIcon,
  EnvelopeSimpleIcon,
  ListBulletsIcon,
  MicrophoneIcon,
  PauseIcon,
  PencilSimpleIcon,
  PushPinIcon,
  SparkleIcon,
  SpeakerHighIcon,
  StopIcon,
  TextAlignLeftIcon,
  TranslateIcon,
  UploadSimpleIcon,
  UsersIcon,
  WaveformIcon,
  type Icon,
} from "@phosphor-icons/react";
import { useSpeechRecognition } from "./SpeechRecognitionService";
import Gated from "./Gated";
import UnsupportedDialog from "./UnsupportedDialog";
import { isRecorderSupported, useAudioRecorder } from "@/hooks/use-audio-recorder";
import type { Engine } from "@/hooks/use-ai-settings";
import type { Note, NoteTag } from "@/hooks/use-notes";
import { LANGUAGES } from "@/hooks/use-preferences";
import { transcribe, transformText, type TextAction } from "@/lib/ai-client";
import { countSpeakers, toParas, type Para } from "@/lib/paragraphs";

type VersionKey = "original" | TextAction;

const VERSIONS: { key: VersionKey; label: string; icon: Icon }[] = [
  { key: "original", label: "Original", icon: MicrophoneIcon },
  { key: "clean", label: "Cleaned up", icon: SparkleIcon },
  { key: "email", label: "Email", icon: EnvelopeSimpleIcon },
  { key: "bullets", label: "Bullets", icon: ListBulletsIcon },
  { key: "summary", label: "Summary", icon: TextAlignLeftIcon },
  { key: "translate", label: "Translate", icon: TranslateIcon },
];


const ICON = { size: 18, weight: "duotone" } as const;

export interface AiState {
  configured: boolean | null;
  signedIn: boolean;
  enabled: boolean;
  active: boolean;
  engine: Engine;
  labelSpeakers: boolean;
  setEnabled: (value: boolean) => void;
  setEngine: (value: Engine) => void;
  setLabelSpeakers: (value: boolean) => void;
  signIn: (password: string) => Promise<void>;
  signOut: () => Promise<void>;
}

interface ReadAloud {
  playing: string | null;
  loading: string | null;
  progress: number;
  toggle: (id: string, text: string) => void;
  stop: () => void;
}

interface RecorderProps {
  ai: AiState;
  readAloud: ReadAloud;
  onPin: (note: Omit<Note, "id" | "createdAt" | "title">) => void;
  onCopy: (text: string) => void;
  onRequestSignIn: () => void;
  // From Settings: the starting translate language, and whether a finished
  // transcript goes straight to the clipboard.
  defaultLanguage: string;
  autoCopy: boolean;
}

function flatten(paras: Para[], withLabels: boolean): string {
  return paras
    .map((p) => (withLabels && p.speaker ? `${p.speaker}: ` : "") + (p.bullet ? "- " : "") + p.text)
    .join("\n\n");
}

export default function Recorder({
  ai,
  readAloud,
  onPin,
  onCopy,
  onRequestSignIn,
  defaultLanguage,
  autoCopy,
}: RecorderProps) {
  // The transcript being edited, before it's pinned. Each AI version is
  // made once per transcript and cached.
  const [versions, setVersions] = useState<Partial<Record<VersionKey, string>>>({});
  const [version, setVersion] = useState<VersionKey>("original");
  // The picker follows the Settings default until it's changed here.
  const [pickedLanguage, setLanguage] = useState<string | null>(null);
  const language = pickedLanguage ?? defaultLanguage;
  const [generating, setGenerating] = useState<VersionKey | null>(null);
  const [fromUpload, setFromUpload] = useState(false);
  const [transcribing, setTranscribing] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  // Hand-editing the shown version, for words the transcriber got wrong.
  const [editing, setEditing] = useState(false);
  const abortRef = useRef<AbortController | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const [unsupportedOpen, setUnsupportedOpen] = useState(false);

  // Turning AI on needs a session; without one, ask for the password.
  const turnAiOn = () => {
    if (ai.signedIn) ai.setEnabled(true);
    else onRequestSignIn();
  };

  const startTranscript = useCallback((text: string, upload: boolean) => {
    abortRef.current?.abort();
    setVersions(text ? { original: text } : {});
    setVersion("original");
    setGenerating(null);
    setFromUpload(upload);
    setEditing(false);
  }, []);

  useEffect(() => () => abortRef.current?.abort(), []);

  // A finished transcript, from either engine. Auto-copy reads the latest
  // setting through a ref so the engines' callbacks stay stable.
  const autoCopyRef = useRef(autoCopy);
  const onCopyRef = useRef(onCopy);
  useEffect(() => {
    autoCopyRef.current = autoCopy;
    onCopyRef.current = onCopy;
  });
  const finishTranscript = useCallback(
    (text: string, upload: boolean) => {
      startTranscript(text, upload);
      if (autoCopyRef.current && text.trim()) onCopyRef.current(text);
    },
    [startTranscript]
  );

  // Browser engine: live words, finished text lands when the session ends.
  const speech = useSpeechRecognition(
    useCallback((text: string) => finishTranscript(text, false), [finishTranscript])
  );

  // Whisper engine: record, then send the audio off.
  const { labelSpeakers } = ai;
  const handleAudio = useCallback(
    async (audio: File, upload: boolean) => {
      startTranscript("", upload);
      setTranscribing(upload ? audio.name : "your recording");
      setError(null);
      try {
        finishTranscript(await transcribe(audio, labelSpeakers), upload);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Transcription failed.");
      } finally {
        setTranscribing(null);
      }
    },
    [labelSpeakers, startTranscript, finishTranscript]
  );
  const recorder = useAudioRecorder(
    useCallback((audio: File) => handleAudio(audio, false), [handleAudio])
  );

  // Signed in on a browser without a speech engine: Whisper regardless of
  // the saved choice.
  const useWhisper = ai.engine === "whisper" || (ai.active && !speech.isSupported);
  const isRecording = useWhisper ? recorder.isRecording : speech.isRecording;
  const recSupported = useWhisper ? isRecorderSupported() : speech.isSupported;
  // No speech engine (Firefox): the mic stays tappable and explains why.
  const explainUnsupported = !useWhisper && !speech.isSupported;
  const busy = isRecording || transcribing !== null;
  const shownError =
    error ?? (useWhisper ? recorder.error : explainUnsupported ? null : speech.error);

  const toggleRec = () => {
    if (explainUnsupported) {
      setUnsupportedOpen(true);
      return;
    }
    if (isRecording) {
      if (useWhisper) recorder.stop();
      else speech.stopRecording();
      return;
    }
    setError(null);
    startTranscript("", false);
    if (useWhisper) void recorder.start();
    else speech.startRecording();
  };

  const pick = async (key: VersionKey) => {
    if (busy || !versions.original) return;
    setVersion(key);
    if (key === "original" || versions[key]) return;
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    setGenerating(key);
    setError(null);
    try {
      const text = await transformText(key, versions.original, language, controller.signal);
      setVersions((v) => ({ ...v, [key]: text }));
    } catch (err) {
      if (!controller.signal.aborted) {
        setError(err instanceof Error ? err.message : "The AI request failed.");
        setVersion("original");
      }
    } finally {
      if (abortRef.current === controller) setGenerating(null);
    }
  };

  const changeLanguage = (next: string) => {
    setLanguage(next);
    setVersions((v) => ({ ...v, translate: undefined }));
    if (version === "translate") setVersion("original");
  };

  // What's on screen: live words while the browser engine listens,
  // otherwise the chosen version.
  const showLabels = ai.labelSpeakers && useWhisper;
  const liveText = !useWhisper && speech.isRecording ? speech.transcription : "";
  const current = isRecording ? liveText : (versions[version] ?? "");
  const paras = generating ? [] : toParas(current);
  const interim = !useWhisper && speech.isRecording ? speech.interimTranscription : "";
  const finalText = flatten(paras, showLabels);
  const hasTranscript = Boolean(versions.original) && !isRecording;

  // Fixing the original makes the AI versions out of date, so they're
  // dropped and made again from the fixed text when picked.
  const editText = (text: string) =>
    setVersions((v) => (version === "original" ? { original: text } : { ...v, [version]: text }));

  const discard = () => {
    if (readAloud.playing === "live" || readAloud.loading === "live") readAloud.stop();
    startTranscript("", false);
  };

  const pin = () => {
    const tags: NoteTag[] = [];
    if (version !== "original") tags.push(version);
    if (fromUpload) tags.push("upload");
    onPin({
      text: finalText,
      speakers: showLabels ? countSpeakers(paras) : 0,
      tags,
      language: version === "translate" ? language : undefined,
    });
    discard();
  };

  // Keyboard shortcuts (listed in Settings). Space works anywhere except on
  // another control, where Space presses that control. P, C, and Esc work
  // anywhere except while typing. Nothing fires with a dialog open.
  const micDisabled = (!recSupported && !explainUnsupported) || transcribing !== null;
  const canAct = hasTranscript && generating === null;
  const keysRef = useRef<Record<string, () => void>>({});
  useEffect(() => {
    keysRef.current = {
      " ": micDisabled ? () => {} : toggleRec,
      p: canAct ? pin : () => {},
      c: canAct ? () => onCopy(finalText) : () => {},
      Escape: hasTranscript ? discard : () => {},
    };
  });
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.repeat || event.ctrlKey || event.metaKey || event.altKey) return;
      const key = event.key.length === 1 ? event.key.toLowerCase() : event.key;
      const action = keysRef.current[key];
      if (!action || document.querySelector("[role='dialog']")) return;
      const target = event.target as HTMLElement | null;
      if (target?.closest("input, textarea, select, [contenteditable]")) return;
      if (key === " " && target?.closest("button, a, label")) return;
      event.preventDefault();
      action();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const statusTitle = transcribing
    ? `Transcribing ${transcribing}…`
    : isRecording
      ? "Listening"
      : hasTranscript
        ? "Ready to edit"
        : "Tap to talk";
  const statusSub = transcribing
    ? "Whisper is working through the audio."
    : isRecording
      ? useWhisper
        ? "Tap again to stop. Whisper transcribes when you're done."
        : "Tap again to stop. Pauses won't cut you off."
      : hasTranscript
        ? ai.active
          ? "Pick a version below, then pin it to the board."
          : "Pin it to the board, or turn on AI tools for more versions."
        : ai.active && useWhisper
          ? "Or upload an audio file to transcribe it."
          : explainUnsupported
            ? "Dictation isn't available in this browser. Tap the mic for options."
            : "Your words will show up below.";

  const liveReading = readAloud.playing === "live";
  const liveLoading = readAloud.loading === "live";

  return (
    <div className="vt-main">
      <div className="vt-rec-row">
        <div className="vt-rec">
          {isRecording && <span className="vt-rec-pulse" aria-hidden="true" />}
          <button
            type="button"
            className="vt-rec-btn"
            data-recording={isRecording}
            onClick={toggleRec}
            disabled={micDisabled}
            aria-label={isRecording ? "Stop recording" : "Start recording"}
            aria-keyshortcuts="Space"
            title={isRecording ? "Stop (Space)" : "Talk (Space)"}
          >
            {isRecording ? (
              <StopIcon size={38} weight="duotone" aria-hidden="true" />
            ) : (
              <MicrophoneIcon size={38} weight="duotone" aria-hidden="true" />
            )}
          </button>
        </div>
        <div className="vt-status" aria-live="polite">
          <h2>{statusTitle}</h2>
          <p className="vt-muted">{statusSub}</p>
        </div>
      </div>

      <div className="vt-controls">
        <fieldset className="field" style={{ border: 0, margin: 0, padding: 0 }} disabled={busy}>
          <legend className="field-label" style={{ padding: 0, fontSize: 12, marginBottom: 5 }}>
            AI tools
          </legend>
          <div className="seg">
            <label className="seg-opt">
              <input type="radio" name="ai" checked={ai.active} onChange={turnAiOn} />
              <SparkleIcon {...ICON} aria-hidden="true" />
              On
            </label>
            <label className="seg-opt">
              <input type="radio" name="ai" checked={!ai.active} onChange={() => ai.setEnabled(false)} />
              Off
            </label>
          </div>
        </fieldset>
        {ai.signedIn && (
          <button type="button" className="btn btn-ghost" onClick={() => void ai.signOut()} disabled={busy}>
            Sign out
          </button>
        )}

        {/* Shown dimmed while AI is off; a click asks to sign in. */}
        <Gated locked={!ai.active} onUnlock={turnAiOn} className="vt-ai-group">
          <fieldset className="field" style={{ border: 0, margin: 0, padding: 0 }} disabled={ai.active && busy}>
            <legend className="field-label" style={{ padding: 0, fontSize: 12, marginBottom: 5 }}>
              Transcription
            </legend>
            <div className="seg">
              <label className="seg-opt">
                <input type="radio" name="eng" checked={!ai.active || useWhisper} onChange={() => ai.setEngine("whisper")} />
                <WaveformIcon {...ICON} aria-hidden="true" />
                Whisper
              </label>
              <label className="seg-opt">
                <input
                  type="radio"
                  name="eng"
                  checked={ai.active && !useWhisper}
                  onChange={() => ai.setEngine("browser")}
                  disabled={ai.active && !speech.isSupported}
                />
                <BrowserIcon {...ICON} aria-hidden="true" />
                Browser
              </label>
            </div>
          </fieldset>
          <fieldset
            className="field"
            style={{ border: 0, margin: 0, padding: 0 }}
            disabled={ai.active && (busy || !useWhisper)}
          >
            <legend className="field-label" style={{ padding: 0, fontSize: 12, marginBottom: 5 }}>
              Speakers
            </legend>
            <div className="seg">
              <label className="seg-opt">
                <input type="radio" name="spk" checked={ai.labelSpeakers} onChange={() => ai.setLabelSpeakers(true)} />
                <UsersIcon {...ICON} aria-hidden="true" />
                Label
              </label>
              <label className="seg-opt">
                <input type="radio" name="spk" checked={!ai.labelSpeakers} onChange={() => ai.setLabelSpeakers(false)} />
                Off
              </label>
            </div>
          </fieldset>
          <input
            ref={fileRef}
            type="file"
            accept="audio/*"
            className="vt-sr-only"
            tabIndex={-1}
            aria-hidden="true"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) void handleAudio(file, true);
              e.target.value = "";
            }}
          />
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => fileRef.current?.click()}
            disabled={ai.active && (!useWhisper || busy)}
          >
            <UploadSimpleIcon {...ICON} aria-hidden="true" />
            Upload audio
          </button>
        </Gated>
      </div>

      {!ai.active && (
        <p className="vt-hint" style={{ color: "inherit" }}>
          <span className="vt-muted">
            {ai.signedIn
              ? "AI tools send your words to Replicate to clean them up, translate, read aloud, and answer questions."
              : "AI tools need a password. Everything else works without one."}
          </span>{" "}
          {!ai.signedIn && (
            <button type="button" className="vt-link" onClick={onRequestSignIn}>
              Sign in
            </button>
          )}
        </p>
      )}
      <UnsupportedDialog
        open={unsupportedOpen}
        canSignIn={ai.configured === true && !ai.signedIn}
        onClose={() => setUnsupportedOpen(false)}
        onSignIn={() => {
          setUnsupportedOpen(false);
          onRequestSignIn();
        }}
      />
      {ai.active && !useWhisper && (
        <p className="vt-hint">
          The browser engine works in Chrome, Edge, and Safari, and can&rsquo;t read files or label speakers. Whisper works everywhere.
        </p>
      )}
      {shownError && (
        <p role="alert" className="vt-error">
          {shownError}
        </p>
      )}

      <section className="vt-transcript" aria-label="Transcript">
        {/* The four rewrite tabs stay full strength with AI off, so people
            see what the app does; tapping one asks to sign in. Translate
            and its language picker dim like the other AI controls. */}
        <nav aria-label="Versions" className="vt-versions">
          {VERSIONS.filter(({ key }) => key !== "translate").map(({ key, label, icon: VersionIcon }) => (
            <button
              key={key}
              type="button"
              className="vt-version"
              aria-pressed={hasTranscript && version === key}
              disabled={ai.active && (!hasTranscript || generating !== null)}
              onClick={() => (ai.active || key === "original" ? pick(key) : turnAiOn())}
            >
              <VersionIcon size={17} weight="duotone" aria-hidden="true" />
              {label}
            </button>
          ))}
          <Gated locked={!ai.active} onUnlock={turnAiOn} className="vt-versions">
            <button
              type="button"
              className="vt-version"
              aria-pressed={hasTranscript && version === "translate"}
              disabled={ai.active && (!hasTranscript || generating !== null)}
              onClick={() => pick("translate")}
            >
              <TranslateIcon size={17} weight="duotone" aria-hidden="true" />
              {language}
            </button>
            <label className="vt-sr-only" htmlFor="vt-language">
              Translate to
            </label>
            <select
              id="vt-language"
              className="input vt-lang"
              value={language}
              onChange={(e) => changeLanguage(e.target.value)}
              disabled={ai.active && generating !== null}
            >
              {LANGUAGES.map((name) => (
                <option key={name}>{name}</option>
              ))}
            </select>
          </Gated>
        </nav>

        {editing && canAct ? (
          <>
            <label className="vt-sr-only" htmlFor="vt-editor">
              Edit transcript
            </label>
            <textarea
              id="vt-editor"
              className="input vt-editor"
              value={versions[version] ?? ""}
              onChange={(e) => editText(e.target.value)}
              rows={Math.max(6, (versions[version] ?? "").split("\n").length + 2)}
              autoFocus
            />
          </>
        ) : (
          <div className="vt-text" aria-live="polite">
            {generating && (
              <p className="vt-placeholder">
                {generating === "translate" ? `Translating to ${language}…` : "Rewriting…"}
              </p>
            )}
            {!generating && paras.length === 0 && !interim && (
              <p className="vt-placeholder">
                {transcribing ? "Transcribing…" : isRecording ? "Listening…" : "Your words will show up here."}
              </p>
            )}
            {paras.map((p, i) => (
              <div key={i} style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                {showLabels && p.speaker && (
                  <span className="vt-speaker" data-alt={/[02468]$/.test(p.speaker)}>
                    {p.speaker}
                  </span>
                )}
                <p className="vt-para">
                  {p.bullet ? "• " : ""}
                  {p.text}
                  {interim && i === paras.length - 1 && (
                    <span className="vt-interim" aria-hidden="true">
                      {" "}
                      {interim}
                    </span>
                  )}
                </p>
              </div>
            ))}
            {interim && paras.length === 0 && (
              <p className="vt-para">
                <span className="vt-interim" aria-hidden="true">
                  {interim}
                </span>
              </p>
            )}
          </div>
        )}

        {liveReading && (
          <div className="vt-reading vt-muted">
            <span>Reading aloud · {ai.active ? "Natural voice" : "Browser voice"}</span>
            <div className="vt-track">
              <div style={{ width: `${readAloud.progress}%` }} />
            </div>
          </div>
        )}

        <div className="vt-actions">
          <button type="button" className="btn btn-primary" onClick={pin} disabled={!hasTranscript || generating !== null}>
            <PushPinIcon {...ICON} aria-hidden="true" />
            Pin to board
          </button>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => readAloud.toggle("live", finalText)}
            disabled={!hasTranscript || generating !== null}
          >
            {liveReading ? <PauseIcon {...ICON} aria-hidden="true" /> : <SpeakerHighIcon {...ICON} aria-hidden="true" />}
            {liveLoading ? "Loading voice…" : liveReading ? "Pause" : "Read aloud"}
          </button>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => onCopy(finalText)}
            disabled={!hasTranscript || generating !== null}
          >
            <CopyIcon {...ICON} aria-hidden="true" />
            Copy
          </button>
          <button
            type="button"
            className="btn btn-secondary btn-icon"
            onClick={() => setEditing((on) => !on)}
            disabled={!canAct}
            aria-pressed={editing && canAct}
            aria-label={editing ? "Done editing" : "Edit transcript"}
            title={editing ? "Done editing" : "Edit"}
          >
            <PencilSimpleIcon {...ICON} aria-hidden="true" />
          </button>
          <button
            type="button"
            className="btn btn-ghost vt-push"
            onClick={discard}
            disabled={!hasTranscript}
          >
            Discard
          </button>
        </div>
      </section>
    </div>
  );
}
