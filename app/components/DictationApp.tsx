"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import Recorder from "./Recorder";
import SavedNoteEditor from "./SavedNoteEditor";
import ArticleReader from "./ArticleReader";
import AskNotes from "./AskNotes";
import LoginDialog from "./LoginDialog";
import SettingsDialog from "./SettingsDialog";
import { FileTextIcon, FolderIcon, GearSixIcon, HeadphonesIcon, MagnifyingGlassIcon, PlayIcon, PlusIcon, SpeakerHighIcon, StopIcon, TrashIcon, UserIcon, WaveformIcon } from "@phosphor-icons/react";
import { useNotes, type Note } from "@/hooks/use-notes";
import { useAiSettings } from "@/hooks/use-ai-settings";
import { useReadAloud } from "@/hooks/use-read-aloud";
import { SPEEDS, usePreferences } from "@/hooks/use-preferences";
import { useOfflineApp } from "@/hooks/use-offline-app";

// No browser speech engine (Firefox): Whisper is the only way to dictate.
const hasSpeechEngine = () =>
  typeof window !== "undefined" && ("SpeechRecognition" in window || "webkitSpeechRecognition" in window);

// Superdesign workspace: saved notes, an editor, and search/listening tools.
export default function DictationApp(): React.ReactElement {
  const { notes, addNote, updateNote, removeNote, clearNotes, maxNotes } = useNotes();
  const ai = useAiSettings();
  const prefs = usePreferences();
  useOfflineApp();
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

  const [selectedId, setSelectedId] = useState<string | null>("");
  const [query, setQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [confirmClear, setConfirmClear] = useState(false);
  const [listeningId, setListeningId] = useState<string | null>(null);
  const [noteSpeed, setNoteSpeed] = useState<number | null>(null);
  const readAloud = useReadAloud(ai.active, flash, noteSpeed ?? prefs.speed);
  const selectedNote = selectedId === null ? null : notes.find(note => note.id === selectedId) ?? notes[0];
  const listeningNote = notes.find(note => note.id === (listeningId ?? readAloud.playing ?? readAloud.loading)) ?? selectedNote ?? notes[0];
  const readingNote = Boolean(listeningNote && readAloud.playing === listeningNote.id);
  const loadingNote = Boolean(listeningNote && readAloud.loading === listeningNote.id);
  const search = query.trim().toLocaleLowerCase();
  const filteredNotes = notes.filter(note => {
    const matchesCategory = categoryFilter === "all" || (categoryFilter === "upload" ? note.tags.includes("upload") : note.speakers > 1);
    return matchesCategory && (!search || `${note.title} ${note.text}`.toLocaleLowerCase().includes(search));
  });

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
    <>
      <div className="sd-shell">
        <aside className="sd-library" aria-label="Saved notes">
          <header className="sd-brand-row">
            <div className="sd-brand"><span className="sd-brand-icon"><WaveformIcon size={22} aria-hidden="true" /></span><h1>VCE2TXT</h1></div>
            <button type="button" className="btn btn-ghost btn-icon" onClick={() => setSettingsOpen(true)} aria-label="Settings"><GearSixIcon size={20} aria-hidden="true" /></button>
          </header>
          <div className="sd-library-new"><button type="button" className="btn btn-primary" onClick={() => { readAloud.stop(); setSelectedId(null); }}><PlusIcon size={19} aria-hidden="true" />New transcription</button></div>
          <div className="sd-library-scroll">
            <div className="sd-list-heading"><h2>Saved notes</h2><span>{notes.length} / {maxNotes}</span></div>
            <ul className="sd-note-list">
              {filteredNotes.map((note) => (
                <li key={note.id}>
                  <button type="button" className="sd-library-note" aria-current={selectedNote?.id === note.id ? "true" : undefined} onClick={() => setSelectedId(note.id)}>
                    <FileTextIcon size={21} aria-hidden="true" />
                    <span><strong>{note.title}</strong><small>{new Date(note.createdAt).toLocaleDateString(undefined, { month: "short", day: "numeric" })} · {note.text.trim().split(/\s+/).length} words</small></span>
                  </button>
                </li>
              ))}
            </ul>
            {filteredNotes.length === 0 && <p className="sd-empty">{query.trim() ? "No notes match this search." : notes.length ? "No notes in this category." : "Your pinned notes will appear here. Start a transcription to add one."}</p>}
            <h2 className="sd-category-heading">Categories</h2>
            <div className="sd-categories">
              {([
                { id: "all", label: "All notes", count: notes.length },
                { id: "upload", label: "Audio uploads", count: notes.filter(note => note.tags.includes("upload")).length },
                { id: "speakers", label: "With speakers", count: notes.filter(note => note.speakers > 1).length },
              ] as const).map(category => <button type="button" key={category.id} aria-pressed={category.id === categoryFilter} onClick={() => setCategoryFilter(category.id)}><span><FolderIcon size={16} aria-hidden="true" />{category.label}</span><span className="sd-category-count">{category.count}</span></button>)}
            </div>
          </div>
          <footer className="sd-library-footer">
            <div className="sd-local-avatar"><UserIcon size={21} aria-hidden="true" /></div>
            <div><strong>{prefs.name || "Your workspace"}</strong><p>Notes stay in this browser</p></div>
            {confirmClear ? <div className="sd-clear-confirm"><span>Clear all saved notes?</span><button type="button" className="btn btn-secondary sd-delete" onClick={() => { readAloud.stop(); clearNotes(); setSelectedId(null); setConfirmClear(false); }}>Clear notes</button><button type="button" className="btn btn-ghost" onClick={() => setConfirmClear(false)}>Keep</button></div> : <button type="button" className="btn btn-ghost btn-icon" aria-label="Clear all notes" disabled={!notes.length} onClick={() => setConfirmClear(true)}><TrashIcon size={17} aria-hidden="true" /></button>}
          </footer>
        </aside>

        <section className="sd-workspace" aria-label="Transcription workspace">
          {selectedNote ? <SavedNoteEditor key={selectedNote.id} note={selectedNote} reading={readAloud.playing === selectedNote.id} loading={readAloud.loading === selectedNote.id} progress={readAloud.progress}
            onCopy={() => void copy(selectedNote.text)} onRead={() => readNote(selectedNote)} onRemove={() => removeOne(selectedNote.id)}
            onSave={(patch) => { readAloud.stop(); updateNote(selectedNote.id, patch); flash("Note saved"); }} /> : null}
          <div className="sd-draft" hidden={Boolean(selectedNote)}>
            <header className="sd-editor-header"><div className="sd-editor-title"><h2>New transcription</h2><span className="sd-saved-label sd-draft-label">Draft</span></div><span className="sd-header-help">Speak or type a note</span></header>
            <Recorder active={!selectedNote} ai={ai} readAloud={readAloud} onCopy={copy}
              onPin={(note) => { addNote(note); flash("Pinned to your notes"); }}
              onRequestSignIn={() => setLoginOpen(true)} defaultLanguage={prefs.language} autoCopy={prefs.autoCopy} />
          </div>
        </section>

        <aside className="sd-listening" aria-label="Search and listening">
          <header className="sd-listening-header"><HeadphonesIcon size={20} aria-hidden="true" /><h2>Search &amp; listen</h2></header>
          <div className="sd-listening-scroll">
            <section className="sd-search" aria-labelledby="search-notes-heading" data-shortcuts="off">
              <h2 id="search-notes-heading">Search your notes</h2>
              <div className="sd-search-field"><MagnifyingGlassIcon size={18} aria-hidden="true" /><label className="vt-sr-only" htmlFor="notes-search">Search your notes</label><input id="notes-search" className="input" type="search" placeholder="Find something you said…" value={query} onChange={(event) => setQuery(event.target.value)} /></div>
              {query.trim() && <p className="sd-search-count" role="status">{filteredNotes.length} matching {filteredNotes.length === 1 ? "note" : "notes"}</p>}
              <details className="sd-ai-search"><summary>Ask a question about your notes</summary><AskNotes notes={notes} onOpen={(id) => setSelectedId(id)} locked={!ai.active} onUnlock={unlockAi} /></details>
            </section>
            <ArticleReader defaultSpeed={prefs.speed} />
            <section className="sd-note-listener" aria-labelledby="listen-notes-heading" data-shortcuts="off">
              <h2 id="listen-notes-heading"><SpeakerHighIcon size={21} aria-hidden="true" />Listen to your notes</h2>
              <p className="vt-muted">Pick a saved note to hear it read aloud.</p>
              <label className="vt-sr-only" htmlFor="note-to-read">Choose a note</label>
              <select id="note-to-read" className="input" value={listeningNote?.id ?? ""} disabled={!notes.length} onChange={(event) => { readAloud.stop(); setListeningId(event.target.value); }}>
                {!notes.length && <option value="">Pin a note first</option>}
                {notes.map(note => <option key={note.id} value={note.id}>{note.title}</option>)}
              </select>
              <div className="sd-listener-actions"><button type="button" className="btn btn-secondary" disabled={!listeningNote} onClick={() => listeningNote && readNote(listeningNote)}><PlayIcon size={18} aria-hidden="true" />{readingNote ? "Stop reading" : loadingNote ? "Cancel voice" : "Listen to note"}</button><button type="button" className="btn btn-secondary btn-icon" disabled={!readAloud.playing && !readAloud.loading} onClick={readAloud.stop} aria-label="Stop reading note"><StopIcon size={18} aria-hidden="true" /></button></div>
              <div className="sd-note-speed"><label htmlFor="note-speed">Reading speed</label><select id="note-speed" className="input" value={noteSpeed ?? prefs.speed} onChange={(event) => setNoteSpeed(Number(event.target.value))}>{SPEEDS.map(speed => <option key={speed} value={speed}>{speed}×</option>)}</select></div>
            </section>
          </div>
        </aside>
      </div>

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
    </>
  );
}
