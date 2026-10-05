// Server-only helpers for the Replicate HTTP API. Route handlers import
// this; client components must not, since it reads the API token.

const API = "https://api.replicate.com/v1";

// Model choices. Each can be swapped without a code change.
export const MODELS = {
  text: process.env.REPLICATE_TEXT_MODEL ?? "meta/meta-llama-3-70b-instruct",
  transcribe:
    process.env.REPLICATE_TRANSCRIBE_MODEL ?? "thomasmol/whisper-diarization",
  speech: process.env.REPLICATE_SPEECH_MODEL ?? "jaaari/kokoro-82m",
};

// Stay under the 60-second function limit (Vercel Hobby), leaving room
// to cancel and respond.
const DEADLINE_MS = 55_000;
const POLL_MS = 1_500;

export class ReplicateError extends Error {
  constructor(
    message: string,
    readonly status = 502
  ) {
    super(message);
  }
}

interface Prediction {
  id: string;
  status: "starting" | "processing" | "succeeded" | "failed" | "canceled";
  output: unknown;
  error: string | null;
  urls: { get: string; cancel: string };
}

export function isConfigured(): boolean {
  return Boolean(process.env.REPLICATE_API_TOKEN);
}

function authHeaders(): Record<string, string> {
  const token = process.env.REPLICATE_API_TOKEN;
  if (!token) {
    throw new ReplicateError(
      "AI features are off. Set REPLICATE_API_TOKEN on the server.",
      503
    );
  }
  return { Authorization: `Bearer ${token}` };
}

async function readJson<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const body = await response.text().catch(() => "");
    console.error("Replicate request failed", response.status, body);
    throw new ReplicateError(
      response.status === 401
        ? "The Replicate API token was rejected."
        : response.status === 429
          ? "Replicate is rate limiting us. Wait a moment and try again."
          : "The AI service had a problem. Try again."
    );
  }
  return (await response.json()) as T;
}

// Runs a model and returns its output. `model` is "owner/name" (latest
// version) or "owner/name:version". Waits up to 30 seconds in the first
// request, then polls until the deadline.
export async function run(
  model: string,
  input: Record<string, unknown>,
  signal?: AbortSignal
): Promise<unknown> {
  const started = Date.now();
  let prediction = await readJson<Prediction>(
    await fetch(`${API}/predictions`, {
      method: "POST",
      headers: {
        ...authHeaders(),
        "Content-Type": "application/json",
        Prefer: "wait=30",
      },
      body: JSON.stringify({ version: model, input }),
      signal,
    })
  );

  while (prediction.status === "starting" || prediction.status === "processing") {
    if (Date.now() - started > DEADLINE_MS) {
      await fetch(prediction.urls.cancel, {
        method: "POST",
        headers: authHeaders(),
      }).catch(() => {});
      throw new ReplicateError("The AI took too long. Try a shorter clip.", 504);
    }
    await new Promise((resolve) => setTimeout(resolve, POLL_MS));
    prediction = await readJson<Prediction>(
      await fetch(prediction.urls.get, { headers: authHeaders(), signal })
    );
  }

  if (prediction.status !== "succeeded") {
    console.error("Replicate prediction", prediction.id, prediction.error);
    throw new ReplicateError(
      prediction.status === "canceled"
        ? "The AI request was canceled."
        : "The AI couldn't finish that request. Try again."
    );
  }
  return prediction.output;
}

// Uploads a file to Replicate and returns a URL a model can read.
export async function uploadFile(file: Blob, filename: string): Promise<string> {
  const form = new FormData();
  form.append("content", file, filename);
  const uploaded = await readJson<{ urls: { get: string } }>(
    await fetch(`${API}/files`, {
      method: "POST",
      headers: authHeaders(),
      body: form,
    })
  );
  return uploaded.urls.get;
}

// Language models on Replicate stream tokens, so output is a string array.
export function outputText(output: unknown): string {
  if (typeof output === "string") return output.trim();
  if (Array.isArray(output)) return output.join("").trim();
  return "";
}

export function errorResponse(error: unknown): Response {
  if (error instanceof ReplicateError) {
    return Response.json({ error: error.message }, { status: error.status });
  }
  console.error(error);
  return Response.json(
    { error: "Something went wrong. Try again." },
    { status: 500 }
  );
}
