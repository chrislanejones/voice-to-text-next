"use client";

import { useEffect, useState, useSyncExternalStore } from "react";

// AI features send note text and audio to Replicate, so they're off until
// the user turns them on. The choice is kept per browser.

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

// null while checking; false when the server has no Replicate token.
function useServerConfigured(): boolean | null {
  const [configured, setConfigured] = useState<boolean | null>(null);
  useEffect(() => {
    let active = true;
    fetch("/api/ai/status")
      .then((r) => (r.ok ? r.json() : { configured: false }))
      .then((data: { configured?: boolean }) => {
        if (active) setConfigured(data.configured === true);
      })
      .catch(() => {
        if (active) setConfigured(false);
      });
    return () => {
      active = false;
    };
  }, []);
  return configured;
}

export function useAiSettings() {
  const current = useSyncExternalStore(subscribe, getSnapshot, () => DEFAULTS);
  const configured = useServerConfigured();
  // AI is live only when the user opted in AND the server can serve it.
  const active = current.enabled && configured === true;
  return {
    ...current,
    configured,
    active,
    engine: active ? current.engine : ("browser" as Engine),
    setEnabled: (enabled: boolean) => update({ enabled }),
    setEngine: (engine: Engine) => update({ engine }),
    setLabelSpeakers: (labelSpeakers: boolean) => update({ labelSpeakers }),
  };
}
