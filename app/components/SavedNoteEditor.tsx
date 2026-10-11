"use client";

import { useState } from "react";
import { CopyIcon, DownloadSimpleIcon, PencilSimpleIcon, PlayIcon, StopIcon, TrashIcon } from "@phosphor-icons/react";
import type { Note } from "@/hooks/use-notes";
import { noteDateline, noteTags } from "@/lib/note-format";

interface Props {
  note: Note;
  reading: boolean;
  loading: boolean;
  progress: number;
  onSave: (patch: { title: string; text: string }) => void;
  onRead: () => void;
  onCopy: () => void;
  onRemove: () => void;
}

export default function SavedNoteEditor({ note, reading, loading, progress, onSave, onRead, onCopy, onRemove }: Props) {
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState(note.title);
  const [text, setText] = useState(note.text);
  const words = note.text.trim().split(/\s+/).filter(Boolean).length;

  const exportNote = () => {
    const url = URL.createObjectURL(new Blob([`${note.title}\n\n${note.text}`], { type: "text/plain;charset=utf-8" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = `${note.title.replace(/[^\p{L}\p{N} _-]/gu, "").trim().slice(0, 80) || "note"}.txt`;
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  return (
    <div className="sd-note-editor">
      <header className="sd-editor-header">
        <div className="sd-editor-title">
          <h2>{note.title}</h2>
          <span className="sd-saved-label">Saved note</span>
        </div>
        <div className="sd-editor-tools">
          <button type="button" className="btn btn-ghost" onClick={onCopy}><CopyIcon size={17} aria-hidden="true" />Copy</button>
          <button type="button" className="btn btn-primary sd-export" onClick={exportNote}><DownloadSimpleIcon size={17} aria-hidden="true" />Export</button>
        </div>
      </header>
      <section className="sd-note-content" aria-label="Saved note content">
        <div className="sd-note-meta">
          <span>{noteDateline(note)}</span>
          <button type="button" className="btn btn-secondary" onClick={() => {
            setTitle(note.title);
            setText(note.text);
            setEditing(!editing);
          }} aria-pressed={editing}><PencilSimpleIcon size={16} aria-hidden="true" />{editing ? "Cancel editing" : "Edit note"}</button>
        </div>
        {editing ? (
          <form className="sd-note-form" onSubmit={(event) => {
            event.preventDefault();
            onSave({ title, text });
            setEditing(false);
          }}>
            <label htmlFor="saved-note-title" className="field-label">Title</label>
            <input id="saved-note-title" className="input" value={title} onChange={(event) => setTitle(event.target.value)} />
            <label htmlFor="saved-note-text" className="field-label">Note</label>
            <textarea id="saved-note-text" className="input sd-note-textarea" value={text} onChange={(event) => setText(event.target.value)} rows={14} autoFocus />
            <button type="submit" className="btn btn-primary" disabled={!text.trim()}>Save changes</button>
          </form>
        ) : (
          <div className="sd-note-prose">
            {note.text.split(/\n\s*\n/).filter(Boolean).map((paragraph, index) => (
              <div className="sd-paragraph" key={index}>
                <span className="sd-paragraph-number" aria-hidden="true">{String(index + 1).padStart(2, "0")}</span>
                <p>{paragraph}</p>
              </div>
            ))}
          </div>
        )}
        <div className="sd-note-tags">{noteTags(note).map(tag => <span key={tag.label} className={tag.className}>{tag.label}</span>)}</div>
      </section>
      <footer className="sd-note-footer">
        <button type="button" className="sd-play-button" onClick={onRead} aria-label={reading || loading ? "Stop reading selected note" : "Read selected note aloud"}>
          {reading || loading ? <StopIcon size={22} weight="fill" aria-hidden="true" /> : <PlayIcon size={22} weight="fill" aria-hidden="true" />}
        </button>
        <div className="sd-note-playback" aria-live="polite">
          <span>{loading ? "Preparing voice…" : reading ? "Reading your note" : `${words} words · About ${Math.max(1, Math.ceil(words / 180))} min`}</span>
          <progress max={100} value={reading ? progress : 0} aria-label="Note reading progress" />
        </div>
        <button type="button" className="btn btn-ghost sd-delete" onClick={onRemove} aria-label={`Delete ${note.title}`}><TrashIcon size={18} aria-hidden="true" /></button>
      </footer>
    </div>
  );
}
