// Voices for Replicate's Kokoro (jaaari/kokoro-82m), offered when AI is on.
// The first letter of the id picks the model's language. Shared by the
// speak route (to validate) and the article reader (to list).

export interface CloudVoice { id: string; name: string; lang: string }

const voice = (id: string, name: string, lang: string): CloudVoice => ({ id, name, lang });

export const CLOUD_LANGUAGES: Record<string, string> = {
  en: "English", fr: "French", hi: "Hindi", it: "Italian", ja: "Japanese", zh: "Chinese",
};

export const CLOUD_VOICES: CloudVoice[] = [
  ...["Alloy", "Aoede", "Bella", "Jessica", "Kore", "Nicole", "Nova", "River", "Sarah", "Sky"]
    .map((name) => voice(`af_${name.toLowerCase()}`, `${name} · US`, "en")),
  ...["Adam", "Echo", "Eric", "Fenrir", "Liam", "Michael", "Onyx", "Puck"]
    .map((name) => voice(`am_${name.toLowerCase()}`, `${name} · US`, "en")),
  ...["Alice", "Emma", "Isabella", "Lily"].map((name) => voice(`bf_${name.toLowerCase()}`, `${name} · UK`, "en")),
  ...["Daniel", "Fable", "George", "Lewis"].map((name) => voice(`bm_${name.toLowerCase()}`, `${name} · UK`, "en")),
  voice("ff_siwis", "Siwis", "fr"),
  voice("hf_alpha", "Alpha", "hi"), voice("hf_beta", "Beta", "hi"),
  voice("hm_omega", "Omega", "hi"), voice("hm_psi", "Psi", "hi"),
  voice("if_sara", "Sara", "it"), voice("im_nicola", "Nicola", "it"),
  voice("jf_alpha", "Alpha", "ja"), voice("jf_gongitsune", "Gongitsune", "ja"),
  voice("jf_nezumi", "Nezumi", "ja"), voice("jf_tebukuro", "Tebukuro", "ja"), voice("jm_kumo", "Kumo", "ja"),
  ...["Xiaobei", "Xiaoni", "Xiaoxiao", "Xiaoyi", "Yunjian", "Yunxi", "Yunxia", "Yunyang"]
    .map((name) => voice(`z${name.startsWith("Xiao") ? "f" : "m"}_${name.toLowerCase()}`, name, "zh")),
];

export const DEFAULT_CLOUD_VOICE = "af_bella";

export function cloudVoice(id: string) {
  return CLOUD_VOICES.find((item) => item.id === id);
}

// The best voice for an article's language, or undefined when Kokoro has none.
export function cloudVoiceFor(lang: string, preferred: string) {
  const base = lang.split("-")[0].toLowerCase();
  const chosen = cloudVoice(preferred);
  if (chosen?.lang === base) return chosen;
  return CLOUD_VOICES.find((item) => item.lang === base);
}
