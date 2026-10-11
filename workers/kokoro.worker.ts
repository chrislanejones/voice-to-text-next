import { KokoroTTS } from "kokoro-js";
import { env } from "@huggingface/transformers";

interface SpeechRequest { id: number; text?: string; voice?: string }
const scope = self as unknown as {
  location: { href: string };
  postMessage: (message: unknown, transfer?: Transferable[]) => void;
  onmessage: ((event: MessageEvent<SpeechRequest>) => void) | null;
};

env.allowLocalModels = false;
env.useBrowserCache = true;
env.backends.onnx.wasm!.numThreads = 1;
env.backends.onnx.wasm!.proxy = false;
env.backends.onnx.wasm!.wasmPaths = new URL("./", scope.location.href).href;

let model: Promise<KokoroTTS> | null = null;
function loadModel() {
  if (!model) {
    model = KokoroTTS.from_pretrained("onnx-community/Kokoro-82M-v1.0-ONNX", {
      dtype: "q8",
      device: "wasm",
      progress_callback: (info) => {
        if (info.status === "progress" && info.file.endsWith(".onnx")) {
          scope.postMessage({ type: "progress", progress: info.progress });
        }
      },
    }).catch((error) => { model = null; throw error; });
  }
  return model;
}

// Inference is serial, including when a listener skips a pending phrase.
let queue: Promise<void> = Promise.resolve();
scope.onmessage = (event: MessageEvent<SpeechRequest>) => {
  const { id, text, voice } = event.data;
  queue = queue.then(async () => {
    try {
      const tts = await loadModel();
      if (!text) { scope.postMessage({ type: "ready", id }); return; }
      const audio = await tts.generate(text, { voice: (voice ?? "af_heart") as keyof typeof tts.voices });
      const samples = Float32Array.from(audio.audio);
      scope.postMessage({ type: "audio", id, samples, sampleRate: audio.sampling_rate }, [samples.buffer]);
    } catch {
      scope.postMessage({ type: "error", id, error: "Couldn't load the natural voice. Check your connection or use the browser voice." });
    }
  });
};
