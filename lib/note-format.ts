import type { Note } from "@/hooks/use-notes";

// Dates people read are MM-DD-YYYY (house rule).
export function noteDate(createdAt: number): string {
  const d = new Date(createdAt);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(d.getMonth() + 1)}-${pad(d.getDate())}-${d.getFullYear()}`;
}

export function noteDateline(note: Note): string {
  const time = new Date(note.createdAt).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });
  const speakers = note.speakers > 1 ? ` · ${note.speakers} speakers` : "";
  return `${noteDate(note.createdAt)} · ${time}${speakers}`;
}

// Sticky-note papers: the system's 100/200 tints plus the process yellow,
// pulled down to the same register. Picked from the note's id, so a note
// keeps its color and tilt when others are taken down.
const PAPERS = [
  "color-mix(in srgb, var(--color-process-yellow) 28%, var(--color-neutral-100))",
  "var(--color-accent-100)",
  "var(--color-accent-2-100)",
  "var(--color-accent-200)",
  "color-mix(in srgb, var(--color-process-yellow) 18%, var(--color-neutral-100))",
  "var(--color-accent-2-200)",
];
const ROTS = ["-2deg", "1.4deg", "-0.8deg", "2.1deg", "-1.5deg", "0.9deg", "-2.4deg", "1.1deg", "-1.2deg", "1.8deg"];

function hash(id: string): number {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) | 0;
  return Math.abs(h);
}

export function noteLook(note: Note) {
  const h = hash(note.id);
  return {
    paper: PAPERS[h % PAPERS.length],
    rot: ROTS[h % ROTS.length],
    tape: h % 2 ? "3deg" : "-4deg",
  };
}

export function noteTags(note: Note): { label: string; className: string }[] {
  return note.tags.map((tag) => {
    switch (tag) {
      case "clean":
        return { label: "Cleaned up", className: "tag tag-accent" };
      case "email":
        return { label: "Email", className: "tag tag-accent" };
      case "bullets":
        return { label: "Bullets", className: "tag tag-accent" };
      case "summary":
        return { label: "Summary", className: "tag tag-accent" };
      case "translate":
        return { label: note.language ?? "Translated", className: "tag tag-accent-2" };
      case "upload":
        return { label: "From audio file", className: "tag tag-neutral" };
    }
  });
}
