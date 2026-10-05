"use client";

import { useCallback, useEffect, useState, useSyncExternalStore } from "react";
import { AUTH_EXPIRED_EVENT, signIn, signOut } from "@/lib/ai-client";

// AI features send note text and audio to Replicate and spend the owner's
// credit, so they're off until the user signs in and turns them on. The choice is kept per browser.

export type Engine = "browser" | "whisper";

interface AiSettings {
  enabled: boolean;
  engine: Engine;
  labelSpeakers: boolean;
}

const STORAGE_KEY = "voice-to-text-ai";
// Whisper is the default once AI is on; the browser engine is the fallback.
const DEFAULTS: AiSettings = { enabled: false, engine: "whisper", labelSpeakers: true };

const listeners = new Set<() => void>();
let settings: AiSettings | null = null;

function load(): AiSettings {
  try {
    const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "{}") as Partial<AiSettings>;
    return {
      enabled: parsed.enabled === true,
      engine: parsed.engine === "browser" ? "browser" : "whisper",
      labelSpeakers: parsed.labelSpeakers !== false,
    };
  } catch {
    return DEFAULTS;
  }
}

function getSnapshot(): AiSettings {
  if (settings === null) settings = load();
  return settings;
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  const onStorage = (event: StorageEvent) => {
    if (event.key !== STORAGE_KEY && event.key !== null) return;
    settings = load();
    listeners.forEach((l) => l());
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", onStorage);
  };
}

function update(patch: Partial<AiSettings>): void {
  settings = { ...getSnapshot(), ...patch };
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  } catch {
    // Blocked storage: the setting lasts for this visit only.
  }
  listeners.forEach((l) => l());
}

interface ServerStatus {
  // null while checking; false when the server lacks a token or password.
  configured: boolean | null;
  signedIn: boolean;
}

function useServerStatus() {
  const [status, setStatus] = useState<ServerStatus>({ configured: null, signedIn: false });

  const refresh = useCallback(async () => {
    try {
      const r = await fetch("/api/ai/status", { cache: "no-store" });
      const data = (r.ok ? await r.json() : {}) as { configured?: boolean; signedIn?: boolean };
      setStatus({ configured: data.configured === true, signedIn: data.signedIn === true });
    } catch {
      setStatus({ configured: false, signedIn: false });
    }
  }, []);

  useEffect(() => {
    // Initial check of server state; setState happens after the fetch.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void refresh();
    const onExpired = () => setStatus((s) => ({ ...s, signedIn: false }));
    window.addEventListener(AUTH_EXPIRED_EVENT, onExpired);
    return () => window.removeEventListener(AUTH_EXPIRED_EVENT, onExpired);
  }, [refresh]);

  return { ...status, setSignedIn: (signedIn: boolean) => setStatus((s) => ({ ...s, signedIn })) };
}

export function useAiSettings() {
  const current = useSyncExternalStore(subscribe, getSnapshot, () => DEFAULTS);
  const server = useServerStatus();
  // AI is live only when the server can serve it, this browser is signed
  // in, and the user has it switched on.
  const active = current.enabled && server.configured === true && server.signedIn;
  return {
    ...current,
    configured: server.configured,
    signedIn: server.signedIn,
    active,
    engine: active ? current.engine : ("browser" as Engine),
    setEnabled: (enabled: boolean) => update({ enabled }),
    setEngine: (engine: Engine) => update({ engine }),
    setLabelSpeakers: (labelSpeakers: boolean) => update({ labelSpeakers }),
    signIn: async (password: string) => {
      await signIn(password);
      server.setSignedIn(true);
      update({ enabled: true });
    },
    signOut: async () => {
      await signOut();
      server.setSignedIn(false);
      update({ enabled: false });
    },
  };
}
