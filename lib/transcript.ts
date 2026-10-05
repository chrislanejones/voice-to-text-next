// Turns whisper-diarization output into note text.

interface Segment {
  speaker?: unknown;
  text?: unknown;
}

// "SPEAKER_00" -> "Speaker 1"
function speakerLabel(raw: unknown, order: Map<string, number>): string {
  const key = typeof raw === "string" ? raw : "unknown";
  if (!order.has(key)) order.set(key, order.size + 1);
  return `Speaker ${order.get(key)}`;
}

export function formatTranscript(output: unknown, labelSpeakers: boolean): string {
  const segments = (output as { segments?: unknown })?.segments;
  if (!Array.isArray(segments)) return "";
  const lines: { speaker: string; text: string }[] = [];
  const order = new Map<string, number>();
  for (const segment of segments as Segment[]) {
    const text = typeof segment.text === "string" ? segment.text.trim() : "";
    if (!text) continue;
    const speaker = labelSpeakers ? speakerLabel(segment.speaker, order) : "";
    const last = lines.at(-1);
    // Merge back-to-back segments from the same speaker into one line.
    if (last && last.speaker === speaker) last.text += ` ${text}`;
    else lines.push({ speaker, text });
  }
  return labelSpeakers
    ? lines.map((line) => `${line.speaker}: ${line.text}`).join("\n\n")
    : lines.map((line) => line.text).join(" ");
}
