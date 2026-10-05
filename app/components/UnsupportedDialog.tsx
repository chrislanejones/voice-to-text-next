"use client";

import React from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { MicrophoneSlashIcon } from "@phosphor-icons/react";

interface UnsupportedDialogProps {
  open: boolean;
  // Whether this server offers AI sign-in (Whisper works in every browser).
  canSignIn: boolean;
  onClose: () => void;
  onSignIn: () => void;
}

function browserName(): string {
  if (typeof navigator === "undefined") return "this browser";
  return /firefox|fxios/i.test(navigator.userAgent) ? "Firefox" : "this browser";
}

// Shown when someone taps the mic in a browser without speech recognition
// (Firefox, mainly).
export default function UnsupportedDialog({ open, canSignIn, onClose, onSignIn }: UnsupportedDialogProps) {
  const name = browserName();
  return (
    <Dialog.Root open={open} onOpenChange={(next) => !next && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className="dialog-backdrop" />
        <Dialog.Content className="dialog" style={{ width: "min(440px, calc(100% - 40px))" }}>
          <Dialog.Title className="dialog-title" style={{ display: "flex", alignItems: "center", gap: 8, margin: 0 }}>
            <MicrophoneSlashIcon size={22} weight="duotone" aria-hidden="true" />
            Dictation doesn&rsquo;t work in {name}
          </Dialog.Title>
          <Dialog.Description asChild>
            <div style={{ display: "flex", flexDirection: "column", gap: 10, fontSize: 15 }}>
              <p style={{ margin: 0 }}>
                {name === "Firefox" ? "Firefox doesn’t" : "This browser doesn’t"} have the speech engine the free
                dictation uses.
              </p>
              <ul style={{ margin: 0, paddingLeft: 20, listStyle: "disc", display: "flex", flexDirection: "column", gap: 4 }}>
                <li>Open this page in Chrome, Edge, or Safari to dictate for free.</li>
                {canSignIn && <li>Or sign in to use Whisper, which works in every browser.</li>}
              </ul>
              <p className="vt-muted" style={{ margin: 0, fontSize: 14 }}>
                Your board still works here: open, copy, and read your notes.
              </p>
            </div>
          </Dialog.Description>
          <div className="dialog-actions">
            <Dialog.Close asChild>
              <button type="button" className={canSignIn ? "btn btn-ghost" : "btn btn-primary"}>
                OK
              </button>
            </Dialog.Close>
            {canSignIn && (
              <button type="button" className="btn btn-primary" onClick={onSignIn}>
                Sign in
              </button>
            )}
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
