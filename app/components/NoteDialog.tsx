"use client";

import React, { useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { CopyIcon, PauseIcon, PencilSimpleIcon, SpeakerHighIcon } from "@phosphor-icons/react";
import type { Note } from "@/hooks/use-notes";
import { noteDateline, noteLook } from "@/lib/note-format";

interface NoteDialogProps {
  note: Note | undefined;
  // Opened from a card's pencil: start with the title and text editable.
  startEditing: boolean;
  reading: boolean;
  onClose: () => void;
  onRead: (note: Note) => void;
  onCopy: (text: string) => void;
  onSave: (id: string, patch: { title: string; text: string }) => void;
}

const ICON = { size: 18, weight: "duotone" } as const;

// Radix supplies focus trapping, Escape to close, and scroll lock.
export default function NoteDialog({ note, startEditing, ...rest }: NoteDialogProps) {
  return (
    <Dialog.Root open={Boolean(note)} onOpenChange={(open) => !open && rest.onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className="dialog-backdrop" />
        {note && (
          <Dialog.Content
            className="dialog vt-dialog"
            aria-describedby={undefined}
            style={{ "--paper": noteLook(note).paper } as React.CSSProperties}
            // Reading a note: focus the frame, not the text box, so no focus
            // ring shows on open. Tab still moves into the note. Editing
            // keeps the default, which lands in the title field.
            onOpenAutoFocus={(event) => {
              if (startEditing) return;
              event.preventDefault();
              (event.currentTarget as HTMLElement | null)?.focus();
            }}
          >
            {/* Remounted per note and mode so the edit fields start fresh. */}
            <NoteBody key={`${note.id}-${startEditing}`} note={note} startEditing={startEditing} {...rest} />
          </Dialog.Content>
        )}
      </Dialog.Portal>
    </Dialog.Root>
  );
}

function NoteBody({
  note,
  startEditing,
  reading,
  onRead,
  onCopy,
  onSave,
}: Omit<NoteDialogProps, "note" | "onClose"> & { note: Note }) {
  const [editing, setEditing] = useState(startEditing);
  const [title, setTitle] = useState(note.title);
  const [text, setText] = useState(note.text);

  const startEdit = () => {
    setTitle(note.title);
    setText(note.text);
    setEditing(true);
  };

  const save = (event: React.FormEvent) => {
    event.preventDefault();
    if (!text.trim()) return;
    onSave(note.id, { title, text });
    setEditing(false);
  };

  if (editing) {
    return (
      <form onSubmit={save} className="vt-note-form">
        <Dialog.Title className="vt-sr-only">Edit note</Dialog.Title>
        <span className="vt-dateline" style={{ fontSize: 12 }}>
          {noteDateline(note)}
        </span>
        <div className="field">
          <label className="field-label" htmlFor="note-title">
            Title
          </label>
          <input
            id="note-title"
            className="input vt-note-title-input"
            value={title}
            maxLength={80}
            placeholder="Made from the text if left blank"
            onChange={(e) => setTitle(e.target.value)}
            autoFocus
          />
        </div>
        <div className="field">
          <label className="field-label" htmlFor="note-text">
            Text
          </label>
          <textarea
            id="note-text"
            className="input vt-note-text-input"
            value={text}
            rows={Math.min(14, Math.max(5, text.split("\n").length + 1))}
            onChange={(e) => setText(e.target.value)}
          />
        </div>
        <div className="dialog-actions">
          <button type="button" className="btn btn-ghost" onClick={() => setEditing(false)}>
            Cancel
          </button>
          <button type="submit" className="btn btn-primary" disabled={!text.trim()}>
            Save
          </button>
        </div>
      </form>
    );
  }

  return (
    <>
      <span className="vt-dateline" style={{ fontSize: 12 }}>
        {noteDateline(note)}
      </span>
      <Dialog.Title className="dialog-title">{note.title}</Dialog.Title>
      <div className="vt-dialog-body" tabIndex={0} role="region" aria-label="Note text">
        <p>{note.text}</p>
      </div>
      <div className="dialog-actions">
        <button type="button" className="btn btn-secondary" onClick={() => onRead(note)}>
          {reading ? <PauseIcon {...ICON} aria-hidden="true" /> : <SpeakerHighIcon {...ICON} aria-hidden="true" />}
          {reading ? "Stop" : "Read aloud"}
        </button>
        <button type="button" className="btn btn-secondary" onClick={() => onCopy(note.text)}>
          <CopyIcon {...ICON} aria-hidden="true" />
          Copy
        </button>
        <button type="button" className="btn btn-secondary" onClick={startEdit}>
          <PencilSimpleIcon {...ICON} aria-hidden="true" />
          Edit
        </button>
        <Dialog.Close asChild>
          <button type="button" className="btn btn-primary">
            Done
          </button>
        </Dialog.Close>
      </div>
    </>
  );
}
