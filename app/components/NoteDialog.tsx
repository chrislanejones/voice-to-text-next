"use client";

import React from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { CopyIcon, PauseIcon, SpeakerHighIcon } from "@phosphor-icons/react";
import type { Note } from "@/hooks/use-notes";
import { noteDateline, noteLook } from "@/lib/note-format";

interface NoteDialogProps {
  note: Note | undefined;
  reading: boolean;
  onClose: () => void;
  onRead: (note: Note) => void;
  onCopy: (text: string) => void;
}

const ICON = { size: 18, weight: "duotone" } as const;

// Radix supplies focus trapping, Escape to close, and scroll lock.
export default function NoteDialog({ note, reading, onClose, onRead, onCopy }: NoteDialogProps) {
  return (
    <Dialog.Root open={Boolean(note)} onOpenChange={(open) => !open && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className="dialog-backdrop" />
        {note && (
          <Dialog.Content
            className="dialog vt-dialog"
            aria-describedby={undefined}
            style={{ "--paper": noteLook(note).paper } as React.CSSProperties}
          >
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
              <Dialog.Close asChild>
                <button type="button" className="btn btn-primary">
                  Done
                </button>
              </Dialog.Close>
            </div>
          </Dialog.Content>
        )}
      </Dialog.Portal>
    </Dialog.Root>
  );
}
