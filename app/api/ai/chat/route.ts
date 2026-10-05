import { MODELS, errorResponse, outputText, run } from "@/lib/replicate";

export const maxDuration = 300;

// History holds at most 10 notes, so they all fit in the prompt. No search
// index needed.
const MAX_NOTES = 10;
const MAX_NOTE_CHARS = 5_000;
const MAX_TURNS = 12;

interface Turn {
  role: "user" | "assistant";
  content: string;
}

function isTurn(value: unknown): value is Turn {
  const turn = value as Turn;
  return (
    typeof turn === "object" &&
    turn !== null &&
    (turn.role === "user" || turn.role === "assistant") &&
    typeof turn.content === "string"
  );
}

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as {
    notes?: unknown;
    messages?: unknown;
  } | null;

  const notes = Array.isArray(body?.notes)
    ? body.notes
        .filter((note): note is string => typeof note === "string")
        .slice(0, MAX_NOTES)
        .map((note) => note.slice(0, MAX_NOTE_CHARS))
    : [];
  const messages = Array.isArray(body?.messages)
    ? body.messages.filter(isTurn).slice(-MAX_TURNS)
    : [];
  const question = messages.at(-1);
  if (!question || question.role !== "user" || !question.content.trim()) {
    return Response.json({ error: "Ask a question." }, { status: 400 });
  }

  const noteBlock = notes.length
    ? notes.map((note, i) => `Note ${i + 1}: ${note}`).join("\n\n")
    : "(The user has no saved notes.)";
  const system = `You answer questions about the user's dictated notes. Use only the notes below. If the notes don't cover the question, say so plainly. Keep answers short. Do not mention note numbers in the answer. On the last line, write SOURCES: followed by the note numbers you used, comma-separated, or SOURCES: none.\n\n${noteBlock}`;
  const prompt = messages
    .map((turn) => `${turn.role === "user" ? "User" : "Assistant"}: ${turn.content}`)
    .join("\n\n");

  try {
    const output = await run(
      MODELS.text,
      { system_prompt: system, prompt, max_tokens: 1024, temperature: 0.2 },
      request.signal
    );
    const raw = outputText(output).replace(/^Assistant:\s*/, "");
    // Pull the SOURCES line off and turn it into 0-based note indexes.
    const match = /\n?\s*SOURCES:\s*(.*)\s*$/i.exec(raw);
    const reply = (match ? raw.slice(0, match.index) : raw).trim();
    const sources = match
      ? [...new Set(match[1].match(/\d+/g)?.map(Number) ?? [])]
          .filter((n) => n >= 1 && n <= notes.length)
          .map((n) => n - 1)
      : [];
    if (!reply) throw new Error("Empty model output");
    return Response.json({ reply, sources });
  } catch (error) {
    return errorResponse(error);
  }
}
