"use client";

import { useSyncExternalStore } from "react";

// Pinned notes, kept in this browser. Replaces the old plain-string
// history ("voice-to-text-history"); that key is read once to carry old
// notes over and is left in place, so going back to the old build loses
// nothing.

export type NoteTag = "clean" | "email" | "bullets" | "summary" | "translate" | "upload" | "demo";

export interface Note {
  id: string;
  createdAt: number;
  title: string;
  text: string;
  speakers: number;
  tags: NoteTag[];
  // Set when the note is a translation, e.g. "Spanish".
  language?: string;
  // Index into the board's paper colors. Chosen when the note is pinned so
  // nearby notes never share a color, then kept, so taking a note down
  // doesn't recolor the rest.
  paper?: number;
}

export const PAPER_COUNT = 6;

const STORAGE_KEY = "voice-to-text-notes";
const LEGACY_KEY = "voice-to-text-history";
// Set once the legacy notes have been carried over, so removing the new key
// later can't bring old, already-deleted notes back.
const MIGRATED_KEY = "voice-to-text-notes-migrated";
const MAX_NOTES = 10;
const EMPTY: Note[] = [];
const TAGS = new Set<NoteTag>(["clean", "email", "bullets", "summary", "translate", "upload", "demo"]);

// Sample notes so a brand-new board isn't empty. Seeded once, on a
// browser with no notes and nothing to carry over; taking them down or
// clearing the board keeps them gone.
const DEMO_NOTES: Omit<Note, "id" | "createdAt">[] = [
  {
    title: "Welcome to your workspace",
    text: "Choose New transcription, then tap the microphone or use Edit to type a note. Pin it to keep it in your saved notes.\n\nYour last ten notes stay in this browser. Select one on the left to edit or export it. Use the tools on the right to search your notes, listen to them, or read an article aloud.",
    speakers: 0,
    tags: ["demo"],
  },
  {
    title: "Groceries for the weekend",
    text: "- Coffee beans\n- Two lemons\n- Sourdough\n- Something for Sunday dinner",
    speakers: 0,
    tags: ["demo", "bullets"],
  },
  {
    title: "Idea: read notes aloud on the drive",
    text: "Pin the morning plan, then hit the speaker button to hear it back. Open a note to read the whole thing, or copy it into an email.",
    speakers: 0,
    tags: ["demo"],
  },
];

function demoNotes(now: number): Note[] {
  return DEMO_NOTES.map((note, i) => ({ ...note, id: newId(), createdAt: now - i * 60_000 }));
}

const listeners = new Set<() => void>();
let notes: Note[] | null = null;

function newId(): string {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

// First few words of the first sentence, without speaker labels.
export function titleFrom(text: string): string {
  const firstLine = text
    .replace(/^[^\s:]{1,20} \d{1,2}:\s*/gm, "")
    .replace(/^[-•*]\s+/gm, "")
    .trim();
  const sentence = firstLine.split(/(?<=[.!?])\s|\n/)[0] ?? "";
  const words = sentence.replace(/[.!?,;:]+$/, "").split(/\s+/).filter(Boolean);
  const title = words.slice(0, 6).join(" ");
  if (!title) return "Untitled note";
  return words.length > 6 ? `${title}…` : title;
}

function toNote(value: unknown): Note | null {
  const raw = value as Partial<Note>;
  if (!raw || typeof raw !== "object" || typeof raw.text !== "string") return null;
  return {
    id: typeof raw.id === "string" ? raw.id : newId(),
    createdAt: typeof raw.createdAt === "number" ? raw.createdAt : Date.now(),
    title: typeof raw.title === "string" && raw.title ? raw.title : titleFrom(raw.text),
    text: raw.text,
    speakers: typeof raw.speakers === "number" ? raw.speakers : 0,
    tags: Array.isArray(raw.tags) ? raw.tags.filter((t): t is NoteTag => TAGS.has(t)) : [],
    language: typeof raw.language === "string" ? raw.language : undefined,
    paper:
      Number.isInteger(raw.paper) && raw.paper! >= 0 && raw.paper! < PAPER_COUNT ? raw.paper : undefined,
  };
}

// The first paper not used by the given neighbors. With six papers and at
// most five neighbors there's always one free, so any six notes in a row
// are six different colors (that covers side-by-side and above/below on
// the board's grid).
function freePaper(neighbors: Note[]): number {
  const used = new Set(neighbors.map((n) => n.paper));
  for (let i = 0; i < PAPER_COUNT; i++) if (!used.has(i)) return i;
  return 0;
}

// Gives notes without a paper one, oldest first, each avoiding the five
// notes pinned before it. Returns the same array when nothing changed.
function withPapers(list: Note[]): Note[] {
  if (list.every((n) => n.paper !== undefined)) return list;
  const oldestFirst = [...list].reverse();
  oldestFirst.forEach((note, i) => {
    if (note.paper === undefined) {
      oldestFirst[i] = { ...note, paper: freePaper(oldestFirst.slice(Math.max(0, i - (PAPER_COUNT - 1)), i)) };
    }
  });
  return oldestFirst.reverse();
}

function load(): Note[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw !== null) {
      const parsed: unknown = JSON.parse(raw);
      if (!Array.isArray(parsed)) return EMPTY;
      const list = parsed.map(toNote).filter((n): n is Note => n !== null);
      const colored = withPapers(list);
      // Notes saved before papers existed get theirs once, for good.
      if (colored !== list) localStorage.setItem(STORAGE_KEY, JSON.stringify(colored));
      return colored;
    }
    if (localStorage.getItem(MIGRATED_KEY)) return EMPTY;
    // First run on this build: carry over the old string notes, or seed
    // the samples when there are none. Old notes' real times are unknown,
    // so they're stamped a minute apart, newest first.
    const legacy: unknown = JSON.parse(localStorage.getItem(LEGACY_KEY) ?? "[]");
    const now = Date.now();
    const migrated = (Array.isArray(legacy) ? legacy : [])
      .filter((entry): entry is string => typeof entry === "string" && entry.trim() !== "")
      .slice(0, MAX_NOTES)
      .map((text, i) => ({
        id: newId(),
        createdAt: now - i * 60_000,
        title: titleFrom(text),
        text,
        speakers: 0,
        tags: [] as NoteTag[],
      }));
    const first = withPapers(migrated.length ? migrated : demoNotes(now));
    localStorage.setItem(STORAGE_KEY, JSON.stringify(first));
    localStorage.setItem(MIGRATED_KEY, "1");
    return first;
  } catch {
    return EMPTY;
  }
}

function getSnapshot(): Note[] {
  if (notes === null) notes = load();
  return notes;
}

function getServerSnapshot(): Note[] {
  return EMPTY;
}

function notify(): void {
  listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  // Keep other open tabs in step.
  const onStorage = (event: StorageEvent) => {
    if (event.key !== STORAGE_KEY && event.key !== null) return;
    notes = load();
    notify();
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", onStorage);
  };
}

function save(next: Note[]): void {
  notes = next;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    // Storage is full or blocked; the in-memory copy still works.
  }
  notify();
}

function addNote(input: Omit<Note, "id" | "createdAt" | "title" | "paper"> & { title?: string }): void {
  const current = getSnapshot();
  const note: Note = {
    id: newId(),
    createdAt: Date.now(),
    title: input.title || titleFrom(input.text),
    text: input.text,
    speakers: input.speakers,
    tags: input.tags,
    language: input.language,
    paper: freePaper(current.slice(0, PAPER_COUNT - 1)),
  };
  save([note, ...current].slice(0, MAX_NOTES));
}

// Hand edits from the board. An emptied title falls back to one made
// from the text, like a new note gets.
function updateNote(id: string, patch: { title: string; text: string }): void {
  const text = patch.text;
  const title = patch.title.trim() || titleFrom(text);
  save(getSnapshot().map((note) => (note.id === id ? { ...note, title, text } : note)));
}

function removeNote(id: string): void {
  save(getSnapshot().filter((note) => note.id !== id));
}

function clearNotes(): void {
  save([]);
}

export function useNotes() {
  const entries = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  return { notes: entries, addNote, updateNote, removeNote, clearNotes, maxNotes: MAX_NOTES };
}
