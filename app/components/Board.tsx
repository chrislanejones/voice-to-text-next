"use client";

import React, { useState } from "react";
import {
  ArrowsOutSimpleIcon,
  CopyIcon,
  PauseIcon,
  PencilSimpleIcon,
  SpeakerHighIcon,
  TrashIcon,
  XIcon,
} from "@phosphor-icons/react";
import type { Note } from "@/hooks/use-notes";
import { noteDateline, noteLook, noteTags } from "@/lib/note-format";

interface BoardProps {
  notes: Note[];
  maxNotes: number;
  playing: string | null;
  loading: string | null;
  onRead: (note: Note) => void;
  onCopy: (text: string) => void;
  onOpen: (id: string) => void;
  onEdit: (id: string) => void;
  onRemove: (id: string) => void;
  onClear: () => void;
}

const ICON = { size: 18, weight: "duotone" } as const;

export default function Board({
  notes,
  maxNotes,
  playing,
  loading,
  onRead,
  onCopy,
  onOpen,
  onEdit,
  onRemove,
  onClear,
}: BoardProps) {
  const [confirmClear, setConfirmClear] = useState(false);

  return (
    <section aria-labelledby="board-heading" className="vt-board">
      <div className="vt-board-head">
        <h2 id="board-heading">The board</h2>
        <span className="vt-count vt-muted">
          {notes.length} pinned · keeps your last {maxNotes}
        </span>
        <div className="vt-board-tools">
          {confirmClear ? (
            <>
              <span style={{ fontSize: 14, fontStyle: "italic" }}>Take every note down?</span>
              <button
                type="button"
                className="btn btn-secondary vt-danger"
                onClick={() => {
                  onClear();
                  setConfirmClear(false);
                }}
              >
                Clear board
              </button>
              <button type="button" className="btn btn-ghost" onClick={() => setConfirmClear(false)}>
                Keep
              </button>
            </>
          ) : (
            <button
              type="button"
              className="btn btn-ghost vt-danger"
              onClick={() => setConfirmClear(true)}
              disabled={notes.length === 0}
            >
              <TrashIcon size={17} weight="duotone" aria-hidden="true" />
              Clear board
            </button>
          )}
        </div>
      </div>

      {notes.length === 0 && (
        <p className="vt-faint" style={{ fontStyle: "italic", fontSize: 18 }}>
          Nothing pinned yet.
        </p>
      )}

      <ul role="list" className="vt-notes">
        {notes.map((note) => {
          const look = noteLook(note);
          const reading = playing === note.id || loading === note.id;
          return (
            <li
              key={note.id}
              className="vt-note-li"
              style={{ "--rot": look.rot } as React.CSSProperties}
            >
              <article
                className="vt-note"
                style={{ "--paper": look.paper, "--tape": look.tape } as React.CSSProperties}
                // A click anywhere on the note opens it, except on its own
                // buttons or while selecting text. Keyboard users get the
                // title button, which does the same.
                onClick={(event) => {
                  if ((event.target as HTMLElement).closest("button")) return;
                  if (window.getSelection()?.toString()) return;
                  onOpen(note.id);
                }}
              >
                <span className="vt-tape" aria-hidden="true" />
                <span className="vt-dateline">{noteDateline(note)}</span>
                <h3 style={{ margin: 0, fontSize: "inherit" }}>
                  <button type="button" className="vt-note-title" onClick={() => onOpen(note.id)}>
                    {note.title}
                  </button>
                </h3>
                <p className="vt-note-body">{note.text}</p>
                <div className="vt-tags">
                  {noteTags(note).map((tag) => (
                    <span key={tag.label} className={tag.className}>
                      {tag.label}
                    </span>
                  ))}
                </div>
                <div className="vt-note-actions">
                  <button
                    type="button"
                    className="btn btn-ghost btn-icon"
                    onClick={() => onRead(note)}
                    aria-label={reading ? `Stop reading ${note.title}` : `Read ${note.title} aloud`}
                    title={reading ? "Stop" : "Read aloud"}
                  >
                    {reading ? <PauseIcon {...ICON} aria-hidden="true" /> : <SpeakerHighIcon {...ICON} aria-hidden="true" />}
                  </button>
                  <button
                    type="button"
                    className="btn btn-ghost btn-icon"
                    onClick={() => onCopy(note.text)}
                    aria-label={`Copy ${note.title}`}
                    title="Copy"
                  >
                    <CopyIcon {...ICON} aria-hidden="true" />
                  </button>
                  <button
                    type="button"
                    className="btn btn-ghost btn-icon"
                    onClick={() => onEdit(note.id)}
                    aria-label={`Edit ${note.title}`}
                    title="Edit"
                  >
                    <PencilSimpleIcon {...ICON} aria-hidden="true" />
                  </button>
                  <button
                    type="button"
                    className="btn btn-ghost btn-icon"
                    onClick={() => onOpen(note.id)}
                    aria-label={`Open ${note.title}`}
                    title="Open"
                  >
                    <ArrowsOutSimpleIcon {...ICON} aria-hidden="true" />
                  </button>
                  <button
                    type="button"
                    className="btn btn-ghost btn-icon vt-takedown"
                    onClick={() => onRemove(note.id)}
                    aria-label={`Take down ${note.title}`}
                    title="Take down"
                  >
                    <XIcon {...ICON} aria-hidden="true" />
                  </button>
                </div>
              </article>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
