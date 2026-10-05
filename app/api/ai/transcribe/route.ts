import { MODELS, errorResponse, run, uploadFile } from "@/lib/replicate";
import { requireSignIn } from "@/lib/ai-auth";
import { formatTranscript } from "@/lib/transcript";

export const maxDuration = 300;

// Vercel caps request bodies at 4.5 MB.
const MAX_BYTES = 4_400_000;

export async function POST(request: Request) {
  const denied = requireSignIn(request);
  if (denied) return denied;

  const form = await request.formData().catch(() => null);
  const audio = form?.get("audio");
  if (!(audio instanceof Blob) || audio.size === 0) {
    return Response.json({ error: "Send an audio file." }, { status: 400 });
  }
  if (audio.size > MAX_BYTES) {
    return Response.json(
      { error: "That audio is over 4.4 MB. Try a shorter clip." },
      { status: 413 }
    );
  }
  const labelSpeakers = form?.get("speakers") === "true";
  const language = form?.get("language");

  try {
    const name = audio instanceof File && audio.name ? audio.name : "recording.webm";
    const url = await uploadFile(audio, name);
    const output = await run(
      MODELS.transcribe,
      {
        file: url,
        ...(typeof language === "string" && /^[a-z]{2}$/.test(language)
          ? { language }
          : {}),
      },
      request.signal
    );
    const text = formatTranscript(output, labelSpeakers);
    if (!text) {
      return Response.json({ error: "No speech was found in that audio." }, { status: 422 });
    }
    return Response.json({ text });
  } catch (error) {
    return errorResponse(error);
  }
}
