export interface SpeechChunk { text: string; start: number; end: number }

// Keep browser utterances short and stay below Kokoro's phoneme limit.
// Offsets let the player seek without losing its position in the article.
export function speechChunks(text: string, limit = 220): SpeechChunk[] {
  const chunks: SpeechChunk[] = [];
  let start = 0;
  while (start < text.length) {
    while (/\s/.test(text[start] ?? "") && start < text.length) start++;
    if (start >= text.length) break;
    let end = Math.min(text.length, start + limit);
    if (end < text.length) {
      const part = text.slice(start, end);
      const endings = Array.from(part.matchAll(/[.!?][”"']?(?=\s)|\n\n/g));
      const last = endings.at(-1);
      const boundary = last ? last.index! + last[0].length : part.lastIndexOf(" ");
      if (boundary > 0) end = start + boundary;
    }
    chunks.push({ text: text.slice(start, end).trim(), start, end });
    start = end;
  }
  return chunks;
}
