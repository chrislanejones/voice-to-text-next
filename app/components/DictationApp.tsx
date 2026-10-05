"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import Recorder from "./Recorder";
import Board from "./Board";
import NoteDialog from "./NoteDialog";
import AskNotes from "./AskNotes";
import { useNotes, type Note } from "@/hooks/use-notes";
import { useAiSettings } from "@/hooks/use-ai-settings";
import { useReadAloud } from "@/hooks/use-read-aloud";

// "Voice to Text - Portal" design, minus the scroll hero: recorder and
// versions, Ask your notes beside it, the board of pinned notes below.
export default function DictationApp(): React.ReactElement {
  const { notes, addNote, removeNote, clearNotes, maxNotes } = useNotes();
  const ai = useAiSettings();

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

  const readAloud = useReadAloud(ai.active, flash);
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
        <p className="vt-muted">
          {ai.active ? "Notes stay in this browser · AI tools use Replicate" : "Notes stay in this browser"}
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
        />
        {ai.active && <AskNotes notes={notes} onOpen={setOpenId} />}
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

      {/* Always mounted so screen readers hear each message. */}
      <div role="status" aria-live="polite">
        {toast && <div className="vt-toast">{toast}</div>}
      </div>
    </div>
  );
}
