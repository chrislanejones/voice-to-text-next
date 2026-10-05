import { MODELS, errorResponse, outputText, run } from "@/lib/replicate";
import { requireSignIn } from "@/lib/ai-auth";

// Vercel Hobby caps functions at 60 seconds.
export const maxDuration = 60;

const MAX_CHARS = 20_000;

const ONLY_OUTPUT =
  "Reply with only the result. No preamble, no notes, no quotation marks.";

// Whisper output can carry "Speaker 1:" labels at the start of lines.
const KEEP_LABELS =
  "If lines start with speaker labels like \"Speaker 1:\", keep each label at the start of its line.";

const ACTIONS = {
  clean: `You clean up dictated text. Fix punctuation, capitalization, and obvious speech-recognition mistakes. Remove filler words like "um", "uh", "like", and "you know", and false starts. Keep the speaker's words and meaning; do not add content. ${KEEP_LABELS} ${ONLY_OUTPUT}`,
  email: `You turn dictated notes into a clear, friendly email body with a greeting and sign-off placeholder. Keep every fact; do not invent details. ${ONLY_OUTPUT}`,
  bullets: `You turn dictated text into a concise bulleted list using "- " at the start of each line. Keep every distinct point; do not add content. ${ONLY_OUTPUT}`,
  summary: `You summarize dictated text in two to four sentences. Do not add facts. ${ONLY_OUTPUT}`,
  translate: `You are a translator. Translate the text faithfully, keeping tone and meaning. ${KEEP_LABELS} Translate the labels too. ${ONLY_OUTPUT}`,
} as const;

type Action = keyof typeof ACTIONS;

function isAction(value: unknown): value is Action {
  return typeof value === "string" && value in ACTIONS;
}

export async function POST(request: Request) {
  const denied = requireSignIn(request);
  if (denied) return denied;

  const body = (await request.json().catch(() => null)) as {
    action?: unknown;
    text?: unknown;
    language?: unknown;
  } | null;

  const text = typeof body?.text === "string" ? body.text.trim() : "";
  if (!isAction(body?.action) || !text) {
    return Response.json({ error: "Send an action and some text." }, { status: 400 });
  }
  if (text.length > MAX_CHARS) {
    return Response.json({ error: "That note is too long for AI tools." }, { status: 413 });
  }

  const action = body.action;
  const language =
    typeof body.language === "string" && body.language.trim()
      ? body.language.trim().slice(0, 40)
      : "English";
  const prompt =
    action === "translate" ? `Translate into ${language}:\n\n${text}` : text;

  try {
    const output = await run(
      MODELS.text,
      {
        system_prompt: ACTIONS[action],
        prompt,
        max_tokens: 2048,
        temperature: 0.3,
      },
      request.signal
    );
    const result = outputText(output);
    if (!result) throw new Error("Empty model output");
    return Response.json({ text: result });
  } catch (error) {
    return errorResponse(error);
  }
}
