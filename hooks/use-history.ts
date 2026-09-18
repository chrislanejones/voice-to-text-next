"use client";

import { useSyncExternalStore } from "react";

const STORAGE_KEY = "voice-to-text-history";
const MAX_ENTRIES = 10;
const EMPTY: string[] = [];

type Listener = () => void;

const listeners = new Set<Listener>();
// null until the first read in the browser.
let history: string[] | null = null;

function load(): string[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const parsed: unknown = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed)
      ? parsed.filter((entry): entry is string => typeof entry === "string")
      : EMPTY;
  } catch {
    return EMPTY;
  }
}

function getSnapshot(): string[] {
  if (history === null) history = load();
  return history;
}

function getServerSnapshot(): string[] {
  return EMPTY;
}

function notify(): void {
  listeners.forEach((listener) => listener());
}

function subscribe(listener: Listener): () => void {
  listeners.add(listener);
  // Keep other open tabs in step.
  const onStorage = (event: StorageEvent) => {
    if (event.key !== STORAGE_KEY && event.key !== null) return;
    history = load();
    notify();
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", onStorage);
  };
}

function save(next: string[]): void {
  history = next;
  try {
    if (next.length > 0) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } else {
      localStorage.removeItem(STORAGE_KEY);
    }
  } catch {
    // Storage is full or blocked; the in-memory copy still works.
  }
  notify();
}

function addEntry(text: string): void {
  save([text, ...getSnapshot()].slice(0, MAX_ENTRIES));
}

function removeEntry(index: number): void {
  save(getSnapshot().filter((_, i) => i !== index));
}

function clear(): void {
  save([]);
}

export function useHistory() {
  const entries = useSyncExternalStore(
    subscribe,
    getSnapshot,
    getServerSnapshot
  );
  return { history: entries, addEntry, removeEntry, clear };
}
