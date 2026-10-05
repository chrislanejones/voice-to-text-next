"use client";

import React, { useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { GearSixIcon, LockKeyIcon, SignOutIcon } from "@phosphor-icons/react";
import { LANGUAGES, SPEEDS, type Preferences } from "@/hooks/use-preferences";

interface SettingsDialogProps {
  open: boolean;
  onClose: () => void;
  prefs: Preferences;
  onSave: (prefs: Preferences) => void;
  // null while the server check runs; false when AI isn't set up there.
  aiConfigured: boolean | null;
  signedIn: boolean;
  onSignIn: () => void;
  onSignOut: () => Promise<void>;
}

const SHORTCUTS: [string, string][] = [
  ["Space", "Turn the mic on or off"],
  ["P", "Pin the transcript to the board"],
  ["C", "Copy the transcript"],
  ["Esc", "Discard the transcript"],
];

const LEGEND = { padding: 0, marginBottom: 5 } as const;

// Per-browser settings, the AI sign-in, and the keyboard shortcuts.
export default function SettingsDialog(props: SettingsDialogProps) {
  return (
    <Dialog.Root open={props.open} onOpenChange={(next) => !next && props.onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className="dialog-backdrop" />
        <Dialog.Content className="dialog" style={{ width: "min(480px, calc(100% - 40px))", overflowY: "auto" }}>
          {/* Remounted on each open so the fields start from the saved values. */}
          <SettingsForm {...props} />
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

function SettingsForm({ onClose, prefs, onSave, aiConfigured, signedIn, onSignIn, onSignOut }: SettingsDialogProps) {
  const [draft, setDraft] = useState<Preferences>(prefs);
  const [signingOut, setSigningOut] = useState(false);
  const set = (patch: Partial<Preferences>) => setDraft((d) => ({ ...d, ...patch }));

  const save = (event: React.FormEvent) => {
    event.preventDefault();
    onSave(draft);
    onClose();
  };

  return (
    <>
      <Dialog.Title className="dialog-title" style={{ display: "flex", alignItems: "center", gap: 8, margin: 0 }}>
        <GearSixIcon size={22} weight="duotone" aria-hidden="true" />
        Settings
      </Dialog.Title>
      <Dialog.Description className="vt-muted" style={{ margin: 0, fontSize: 14 }}>
        These stay in this browser.
      </Dialog.Description>

      <form id="settings-form" onSubmit={save} className="vt-settings">
        <div className="field">
          <label className="field-label" htmlFor="settings-name">
            Your name
          </label>
          <input
            id="settings-name"
            className="input"
            type="text"
            autoComplete="given-name"
            maxLength={40}
            placeholder="Shown at the top of the page"
            value={draft.name}
            onChange={(e) => set({ name: e.target.value })}
          />
        </div>

        <div className="field">
          <label className="field-label" htmlFor="settings-language">
            Translate to
          </label>
          <select
            id="settings-language"
            className="input"
            value={draft.language}
            onChange={(e) => set({ language: e.target.value })}
          >
            {LANGUAGES.map((name) => (
              <option key={name}>{name}</option>
            ))}
          </select>
        </div>

        <fieldset className="field" style={{ border: 0, margin: 0, padding: 0 }}>
          <legend className="field-label" style={LEGEND}>
            Read-aloud speed
          </legend>
          <div className="seg">
            {SPEEDS.map((speed) => (
              <label key={speed} className="seg-opt">
                <input type="radio" name="speed" checked={draft.speed === speed} onChange={() => set({ speed })} />
                {speed}×
              </label>
            ))}
          </div>
        </fieldset>

        <label className="vt-check">
          <input type="checkbox" checked={draft.autoCopy} onChange={(e) => set({ autoCopy: e.target.checked })} />
          Copy the transcript as soon as the mic stops
        </label>
      </form>

      <div className="field">
        <span className="field-label">AI tools</span>
        <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
          <span className="vt-muted" style={{ fontSize: 14, flex: "1 1 180px" }}>
            {aiConfigured === null
              ? "Checking…"
              : !aiConfigured
                ? "Not set up on this server."
                : signedIn
                  ? "Signed in."
                  : "Signed out. AI tools need a password."}
          </span>
          {aiConfigured &&
            (signedIn ? (
              <button
                type="button"
                className="btn btn-secondary"
                disabled={signingOut}
                onClick={async () => {
                  setSigningOut(true);
                  await onSignOut();
                  setSigningOut(false);
                }}
              >
                <SignOutIcon size={17} weight="duotone" aria-hidden="true" />
                {signingOut ? "Signing out…" : "Sign out"}
              </button>
            ) : (
              <button type="button" className="btn btn-secondary" onClick={onSignIn}>
                <LockKeyIcon size={17} weight="duotone" aria-hidden="true" />
                Sign in
              </button>
            ))}
        </div>
      </div>

      <div className="field">
        <span className="field-label">Shortcuts</span>
        <table className="vt-shortcuts">
          <tbody>
            {SHORTCUTS.map(([key, action]) => (
              <tr key={key}>
                <td>
                  <kbd>{key}</kbd>
                </td>
                <td>{action}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="dialog-actions">
        <button type="button" className="btn btn-ghost" onClick={onClose}>
          Cancel
        </button>
        <button type="submit" form="settings-form" className="btn btn-primary">
          Save
        </button>
      </div>
    </>
  );
}
