export interface LocalAudio { samples: Float32Array; sampleRate: number }
export const LOCAL_VOICES = [
  { id: "af_heart", name: "Heart · US" },
  { id: "af_bella", name: "Bella · US" },
  { id: "am_michael", name: "Michael · US" },
  { id: "bf_emma", name: "Emma · UK" },
  { id: "bm_george", name: "George · UK" },
] as const;

let worker: Worker | null = null;
let sequence = 0;
const pending = new Map<number, { resolve: (audio: LocalAudio | null) => void; reject: (error: Error) => void; timer: ReturnType<typeof setTimeout> }>();
const listeners = new Set<(progress: number) => void>();

function getWorker() {
  if (worker) return worker;
  worker = new Worker("/speech/kokoro-worker.js", { type: "module" });
  worker.onmessage = (event: MessageEvent<{ type: string; id: number; progress: number; samples: Float32Array; sampleRate: number; error: string }>) => {
    const data = event.data;
    if (data.type === "progress") { listeners.forEach((listener) => listener(data.progress)); return; }
    const job = pending.get(data.id);
    if (!job) return;
    clearTimeout(job.timer);
    pending.delete(data.id);
    if (data.type === "error") job.reject(new Error(data.error));
    else job.resolve(data.type === "audio" ? { samples: data.samples, sampleRate: data.sampleRate } : null);
  };
  worker.onerror = () => resetWorker("The natural voice isn't available in this browser. Use the browser voice instead.");
  return worker;
}

function resetWorker(message: string) {
  worker?.terminate();
  worker = null;
  for (const job of pending.values()) { clearTimeout(job.timer); job.reject(new Error(message)); }
  pending.clear();
}

export function onModelProgress(listener: (progress: number) => void) {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
}

export function localSpeech(text?: string, voice = "af_heart"): Promise<LocalAudio | null> {
  return new Promise((resolve, reject) => {
    const id = ++sequence;
    const timer = setTimeout(() => resetWorker("The natural voice took too long. Try again or choose the browser voice."), 300_000);
    pending.set(id, { resolve, reject, timer });
    try { getWorker().postMessage({ id, text, voice }); }
    catch { resetWorker("Couldn't start the natural voice. Use the browser voice instead."); }
  });
}
