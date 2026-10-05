"use client";

import React, { useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { LockKeyIcon } from "@phosphor-icons/react";

interface LoginDialogProps {
  open: boolean;
  onClose: () => void;
  onSignIn: (password: string) => Promise<void>;
}

// Password popup in front of the AI tools. Radix handles focus trapping,
// Escape, and scroll lock.
export default function LoginDialog({ open, onClose, onSignIn }: LoginDialogProps) {
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const close = () => {
    setPassword("");
    setError(null);
    onClose();
  };

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!password || busy) return;
    setBusy(true);
    setError(null);
    try {
      await onSignIn(password);
      setPassword("");
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Sign-in failed.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog.Root open={open} onOpenChange={(next) => !next && close()}>
      <Dialog.Portal>
        <Dialog.Overlay className="dialog-backdrop" />
        <Dialog.Content className="dialog" style={{ width: "min(420px, calc(100% - 40px))" }}>
          <Dialog.Title className="dialog-title" style={{ display: "flex", alignItems: "center", gap: 8, margin: 0 }}>
            <LockKeyIcon size={22} weight="duotone" aria-hidden="true" />
            Sign in to use AI
          </Dialog.Title>
          <Dialog.Description className="vt-muted" style={{ margin: 0, fontSize: 14 }}>
            AI tools send your words to Replicate and spend the owner&rsquo;s credit, so they&rsquo;re behind a
            password. Without it, everything else still works in this browser.
          </Dialog.Description>
          <form onSubmit={submit} style={{ display: "flex", flexDirection: "column", gap: 15 }}>
            <div className="field">
              <label className="field-label" htmlFor="ai-password">
                Password
              </label>
              <input
                id="ai-password"
                className="input"
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                aria-invalid={error ? true : undefined}
                aria-describedby={error ? "ai-password-error" : undefined}
                autoFocus
              />
            </div>
            {error && (
              <p id="ai-password-error" role="alert" className="vt-error" style={{ margin: 0 }}>
                {error}
              </p>
            )}
            <div className="dialog-actions" style={{ marginTop: 0 }}>
              <button type="button" className="btn btn-ghost" onClick={close}>
                Cancel
              </button>
              <button type="submit" className="btn btn-primary" disabled={!password || busy}>
                {busy ? "Signing in…" : "Sign in"}
              </button>
            </div>
          </form>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
