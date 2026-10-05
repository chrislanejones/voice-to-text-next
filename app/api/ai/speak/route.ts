import { MODELS, errorResponse, run } from "@/lib/replicate";
import { requireSignIn } from "@/lib/ai-auth";

// Vercel Hobby caps functions at 60 seconds.
export const maxDuration = 60;

const MAX_CHARS = 5_000;
const VOICES = new Set(["af_bella", "af_nicole", "af_sarah", "am_adam", "am_michael", "bf_emma", "bm_george"]);

export async function POST(request: Request) {
  const denied = requireSignIn(request);
  if (denied) return denied;

  const body = (await request.json().catch(() => null)) as {
    text?: unknown;
    voice?: unknown;
  } | null;

  const text = typeof body?.text === "string" ? body.text.trim() : "";
  if (!text) {
    return Response.json({ error: "Send some text to read." }, { status: 400 });
  }
  if (text.length > MAX_CHARS) {
    return Response.json({ error: "That note is too long to read aloud." }, { status: 413 });
  }
  const voice =
    typeof body?.voice === "string" && VOICES.has(body.voice) ? body.voice : "af_bella";

  try {
    const output = await run(MODELS.speech, { text, voice, speed: 1 }, request.signal);
    if (typeof output !== "string") throw new Error("Unexpected speech output");
    // Replicate's delivery URLs expire after about an hour, so the client
    // plays it now and doesn't store it.
    return Response.json({ audioUrl: output });
  } catch (error) {
    return errorResponse(error);
  }
}
