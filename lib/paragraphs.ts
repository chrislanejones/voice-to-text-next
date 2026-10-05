// Splits transcript or AI text into display paragraphs: optional speaker
// label ("Speaker 2: …"), optional bullet ("- …").

export interface Para {
  speaker?: string;
  bullet?: boolean;
  text: string;
}

const SPEAKER = /^([^\s:]{1,20} \d{1,2}):\s+/;
const BULLET = /^[-•*]\s+/;

export function toParas(text: string): Para[] {
  return text
    .split(/\n+/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const speaker = SPEAKER.exec(line);
      let rest = speaker ? line.slice(speaker[0].length) : line;
      const bullet = BULLET.test(rest);
      if (bullet) rest = rest.replace(BULLET, "");
      return { speaker: speaker?.[1], bullet, text: rest };
    });
}

// Number of distinct speaker labels.
export function countSpeakers(paras: Para[]): number {
  return new Set(paras.map((p) => p.speaker).filter(Boolean)).size;
}
