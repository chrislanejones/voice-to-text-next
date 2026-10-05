"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import Recorder from "./Recorder";
import Board from "./Board";
import NoteDialog from "./NoteDialog";
import AskNotes from "./AskNotes";
import LoginDialog from "./LoginDialog";
import SettingsDialog from "./SettingsDialog";
import { GearSixIcon } from "@phosphor-icons/react";
import { useNotes, type Note } from "@/hooks/use-notes";
import { useAiSettings } from "@/hooks/use-ai-settings";
import { useReadAloud } from "@/hooks/use-read-aloud";
import { usePreferences } from "@/hooks/use-preferences";

// No browser speech engine (Firefox): Whisper is the only way to dictate.
const hasSpeechEngine = () =>
  typeof window !== "undefined" && ("SpeechRecognition" in window || "webkitSpeechRecognition" in window);

// "Voice to Text - Portal" design, minus the scroll hero: recorder and
// versions, Ask your notes beside it, the board of pinned notes below.
export default function DictationApp(): React.ReactElement {
  const { notes, addNote, removeNote, clearNotes, maxNotes } = useNotes();
  const ai = useAiSettings();
  const prefs = usePreferences();
  const [loginOpen, setLoginOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  // AI off but signed in: switch it on. Signed out: ask for the password.
  const unlockAi = () => {
    if (ai.signedIn) ai.setEnabled(true);
    else setLoginOpen(true);
  };

  const [toast, setToast] = useState<string | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const flash = useCallback((message: string) => {
    if (toastTimer.current) clearTimeout(toastTimer.current);
    setToast(message);
    toastTimer.current = setTimeout(() => setToast(null), 1800);
  }, []);
  useEffect(() => () => {
    if (toastTimer.current) clearTimeout(toastTimer.current);
  }, []);

  const readAloud = useReadAloud(ai.active, flash, prefs.speed);
  const [openId, setOpenId] = useState<string | null>(null);
  const openNote = notes.find((n) => n.id === openId);

  const copy = useCallback(
    async (text: string) => {
      try {
        await navigator.clipboard.writeText(text);
        flash("Copied");
      } catch {
        flash("Couldn’t copy — your browser blocked it");
      }
    },
    [flash]
  );

  const readNote = (note: Note) => readAloud.toggle(note.id, note.text);

  const removeOne = (id: string) => {
    if (readAloud.playing === id || readAloud.loading === id) readAloud.stop();
    removeNote(id);
  };

  return (
    <div className="vt-page">
      <header className="vt-masthead">
        <h1>Voice to Text</h1>
        <button
          type="button"
          className="btn btn-secondary btn-icon vt-cog"
          onClick={() => setSettingsOpen(true)}
          aria-label="Settings"
          title="Settings"
        >
          <GearSixIcon size={26} weight="duotone" aria-hidden="true" />
        </button>
        <p className="vt-muted">
          {prefs.name ? `${prefs.name}’s notes` : "Notes"} stay in this browser
          {ai.active ? " · AI tools use Replicate" : ""}
        </p>
      </header>

      <div className="vt-columns">
        <Recorder
          ai={ai}
          readAloud={readAloud}
          onCopy={copy}
          onPin={(note) => {
            addNote(note);
            flash("Pinned to the board");
          }}
          onRequestSignIn={() => setLoginOpen(true)}
          defaultLanguage={prefs.language}
          autoCopy={prefs.autoCopy}
        />
        <AskNotes notes={notes} onOpen={setOpenId} locked={!ai.active} onUnlock={unlockAi} />
      </div>

      <Board
        notes={notes}
        maxNotes={maxNotes}
        playing={readAloud.playing}
        loading={readAloud.loading}
        onRead={readNote}
        onCopy={copy}
        onOpen={setOpenId}
        onRemove={removeOne}
        onClear={() => {
          readAloud.stop();
          clearNotes();
        }}
      />

      <NoteDialog
        note={openNote}
        reading={Boolean(openNote) && (readAloud.playing === openId || readAloud.loading === openId)}
        onClose={() => setOpenId(null)}
        onRead={readNote}
        onCopy={copy}
      />

      <LoginDialog
        open={loginOpen}
        onClose={() => setLoginOpen(false)}
        onSignIn={async (password) => {
          await ai.signIn(password);
          if (!hasSpeechEngine()) ai.setEngine("whisper");
          flash("Signed in · AI tools on");
        }}
      />

      <SettingsDialog
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        prefs={prefs}
        onSave={prefs.save}
        aiConfigured={ai.configured}
        signedIn={ai.signedIn}
        onSignIn={() => {
          setSettingsOpen(false);
          setLoginOpen(true);
        }}
        onSignOut={async () => {
          readAloud.stop();
          await ai.signOut();
          flash("Signed out");
        }}
      />

      {/* Always mounted so screen readers hear each message. */}
      <div role="status" aria-live="polite">
        {toast && <div className="vt-toast">{toast}</div>}
      </div>
    </div>
  );
}
