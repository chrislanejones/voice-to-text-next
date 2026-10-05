"use client";

import { useSyncExternalStore } from "react";

// Settings from the gear: the name in the masthead, the default translate
// language, read-aloud speed, and auto-copy. Kept in this browser only;
// none of it is an account or leaves the device.

export const LANGUAGES = [
  "Spanish", "English", "French", "German", "Italian",
  "Portuguese", "Chinese", "Japanese", "Korean", "Hindi",
];

export const SPEEDS = [0.75, 1, 1.25, 1.5] as const;

export interface Preferences {
  name: string;
  language: string;
  speed: number;
  autoCopy: boolean;
}

const STORAGE_KEY = "voice-to-text-preferences";
const DEFAULTS: Preferences = { name: "", language: LANGUAGES[0], speed: 1, autoCopy: false };

const listeners = new Set<() => void>();
let prefs: Preferences | null = null;

function load(): Preferences {
  try {
    const raw = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "{}") as Partial<Preferences>;
    return {
      name: typeof raw.name === "string" ? raw.name : "",
      language: typeof raw.language === "string" && LANGUAGES.includes(raw.language) ? raw.language : DEFAULTS.language,
      speed: SPEEDS.some((s) => s === raw.speed) ? (raw.speed as number) : 1,
      autoCopy: raw.autoCopy === true,
    };
  } catch {
    return DEFAULTS;
  }
}

function getSnapshot(): Preferences {
  if (prefs === null) prefs = load();
  return prefs;
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  const onStorage = (event: StorageEvent) => {
    if (event.key !== STORAGE_KEY && event.key !== null) return;
    prefs = load();
    listeners.forEach((l) => l());
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", onStorage);
  };
}

function save(next: Preferences): void {
  prefs = { ...next, name: next.name.trim().slice(0, 40) };
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs));
  } catch {
    // Blocked storage: the settings last for this visit only.
  }
  listeners.forEach((l) => l());
}

export function usePreferences() {
  const current = useSyncExternalStore(subscribe, getSnapshot, () => DEFAULTS);
  return { ...current, save };
}
