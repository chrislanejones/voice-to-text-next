"use client";

import React, { useEffect, useRef, useState } from "react";
import { ArrowBendDownRightIcon, PaperPlaneRightIcon } from "@phosphor-icons/react";
import type { Note } from "@/hooks/use-notes";
import { askNotes, type ChatTurn } from "@/lib/ai-client";
import { noteDate } from "@/lib/note-format";

// Chat over the pinned notes. Answers cite the notes they used.

interface Message extends ChatTurn {
  sourceIds?: string[];
}

const SUGGESTIONS = ["What do I need to do?", "Summarize my notes", "Who did I mention?"];

export default function AskNotes({ notes, onOpen }: { notes: Note[]; onOpen: (id: string) => void }) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [draft, setDraft] = useState("");
  const [thinking, setThinking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => () => abortRef.current?.abort(), []);

  const ask = async (text: string) => {
    const question = text.trim();
    if (!question || thinking || notes.length === 0) return;
    const before = messages;
    const next: Message[] = [...messages, { role: "user", content: question }];
    setMessages(next);
    setDraft("");
    setThinking(true);
    setError(null);
    const controller = new AbortController();
    abortRef.current = controller;
    // Snapshot so source indexes line up with the notes that were sent.
    const sent = notes;
    try {
      const { reply, sources } = await askNotes(
        sent.map((n) => n.text),
        next.map(({ role, content }) => ({ role, content })),
        controller.signal
      );
      setMessages([...next, { role: "assistant", content: reply, sourceIds: sources.map((i) => sent[i].id) }]);
    } catch (err) {
      if (!controller.signal.aborted) {
        setError(err instanceof Error ? err.message : "The AI request failed.");
        setMessages(before);
        setDraft(question);
      }
    } finally {
      setThinking(false);
    }
  };

  const byId = (id: string) => notes.find((n) => n.id === id);

  return (
    <aside className="vt-aside" aria-labelledby="ask-heading">
      <div>
        <span className="vt-kicker" style={{ marginBottom: 10 }}>
          Ask your notes
        </span>
        <h2 id="ask-heading">Ask anything you&rsquo;ve said.</h2>
        <p className="vt-muted" style={{ margin: "6px 0 0", fontSize: 14 }}>
          Answers come only from your {notes.length} pinned {notes.length === 1 ? "note" : "notes"}.
        </p>
      </div>

      {(messages.length > 0 || thinking) && (
        <ol className="vt-chat" aria-live="polite">
          {messages.map((m, i) => (
            <li key={i}>
              {m.role === "user" ? (
                <p className="vt-q">
                  <span className="vt-sr-only">You asked: </span>&ldquo;{m.content}&rdquo;
                </p>
              ) : (
                <>
                  <p className="vt-a">{m.content}</p>
                  {(m.sourceIds ?? []).map((id) => {
                    const note = byId(id);
                    if (!note) return null;
                    return (
                      <button key={id} type="button" className="btn btn-ghost vt-src" onClick={() => onOpen(id)}>
                        <ArrowBendDownRightIcon size={15} weight="duotone" aria-hidden="true" />
                        {note.title} · {noteDate(note.createdAt)}
                      </button>
                    );
                  })}
                </>
              )}
            </li>
          ))}
          {thinking && (
            <li>
              <p className="vt-faint" style={{ margin: 0, fontSize: 14, fontStyle: "italic" }}>
                Reading your notes…
              </p>
            </li>
          )}
        </ol>
      )}

      {error && (
        <p role="alert" className="vt-error" style={{ margin: 0 }}>
          {error}
        </p>
      )}

      {notes.length > 0 && (
        <div className="vt-suggestions">
          {SUGGESTIONS.map((s) => (
            <button key={s} type="button" className="btn btn-ghost" onClick={() => ask(s)} disabled={thinking}>
              {s}
            </button>
          ))}
        </div>
      )}

      <form
        className="vt-ask"
        onSubmit={(e) => {
          e.preventDefault();
          void ask(draft);
        }}
      >
        <label htmlFor="ask-input" className="vt-sr-only">
          Question about your notes
        </label>
        <input
          id="ask-input"
          className="input"
          placeholder={notes.length ? "What did I say about…" : "Pin a note first"}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          disabled={notes.length === 0}
        />
        <button
          type="submit"
          className="btn btn-primary btn-icon"
          aria-label="Ask"
          disabled={thinking || !draft.trim() || notes.length === 0}
        >
          <PaperPlaneRightIcon size={18} weight="duotone" aria-hidden="true" />
        </button>
      </form>
    </aside>
  );
}
