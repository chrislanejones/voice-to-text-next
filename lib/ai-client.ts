// Browser-side calls to the app's own /api/ai routes. The Replicate token
// never reaches the browser.

export type TextAction = "clean" | "email" | "bullets" | "summary" | "translate";

export interface ChatTurn {
  role: "user" | "assistant";
  content: string;
}

async function request<T>(path: string, init: RequestInit): Promise<T> {
  let response: Response;
  try {
    response = await fetch(path, init);
  } catch {
    throw new Error("Couldn't reach the server. Check your connection.");
  }
  const data = (await response.json().catch(() => ({}))) as T & {
    error?: string;
  };
  if (!response.ok) throw new Error(data.error ?? "The AI request failed.");
  return data;
}

function postJson<T>(path: string, body: unknown, signal?: AbortSignal) {
  return request<T>(path, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    signal,
  });
}

export async function transformText(
  action: TextAction,
  text: string,
  language?: string,
  signal?: AbortSignal
): Promise<string> {
  const data = await postJson<{ text: string }>(
    "/api/ai/text",
    { action, text, language },
    signal
  );
  return data.text;
}

export async function speak(text: string, signal?: AbortSignal): Promise<string> {
  const data = await postJson<{ audioUrl: string }>("/api/ai/speak", { text }, signal);
  return data.audioUrl;
}

// `sources` are indexes into the `notes` array that was sent.
export async function askNotes(
  notes: string[],
  messages: ChatTurn[],
  signal?: AbortSignal
): Promise<{ reply: string; sources: number[] }> {
  const data = await postJson<{ reply: string; sources?: number[] }>(
    "/api/ai/chat",
    { notes, messages },
    signal
  );
  return { reply: data.reply, sources: data.sources ?? [] };
}

export async function transcribe(
  audio: Blob,
  labelSpeakers: boolean,
  signal?: AbortSignal
): Promise<string> {
  const form = new FormData();
  const name = audio instanceof File ? audio.name : "recording.webm";
  form.append("audio", audio, name);
  form.append("speakers", String(labelSpeakers));
  const data = await request<{ text: string }>("/api/ai/transcribe", {
    method: "POST",
    body: form,
    signal,
  });
  return data.text;
}
