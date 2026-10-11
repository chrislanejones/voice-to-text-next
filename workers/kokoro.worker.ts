import { KokoroTTS } from "kokoro-js";
import { env } from "@huggingface/transformers";

interface SpeechRequest { id: number; text?: string; voice?: string }
const scope = self as unknown as {
  location: { href: string };
  navigator: { gpu?: { requestAdapter(): Promise<{ features: Set<string> } | null> } };
  postMessage: (message: unknown, transfer?: Transferable[]) => void;
  onmessage: ((event: MessageEvent<SpeechRequest>) => void) | null;
};

env.allowLocalModels = false;
env.useBrowserCache = true;
env.backends.onnx.wasm!.numThreads = 1;
env.backends.onnx.wasm!.proxy = false;
env.backends.onnx.wasm!.wasmPaths = new URL("./", scope.location.href).href;

type Backend = { device: "webgpu" | "wasm"; dtype: "fp16" | "fp32" | "q8" };

// Single-threaded WebAssembly makes speech several times slower than it
// plays on most machines, so the GPU is used whenever the browser has one.
// The GPU model is larger (fp16 about 160 MB, fp32 about 330 MB, against
// 90 MB for q8) but it's cached after the first use.
async function pickBackend(): Promise<Backend> {
  try {
    const adapter = await scope.navigator.gpu?.requestAdapter();
    if (adapter) return { device: "webgpu", dtype: adapter.features.has("shader-f16") ? "fp16" : "fp32" };
  } catch { /* No usable GPU: fall through. */ }
  return { device: "wasm", dtype: "q8" };
}

function load(backend: Backend) {
  return KokoroTTS.from_pretrained("onnx-community/Kokoro-82M-v1.0-ONNX", {
    ...backend,
    progress_callback: (info) => {
      if (info.status === "progress" && info.file.endsWith(".onnx")) {
        scope.postMessage({ type: "progress", progress: info.progress });
      }
    },
  });
}

let model: Promise<KokoroTTS> | null = null;
function loadModel() {
  if (!model) {
    model = pickBackend()
      .then((backend) => load(backend).catch((error) => {
        // A GPU that advertises itself but can't run the model (driver
        // limits, blocked WebGPU) still gets speech, just slower.
        if (backend.device === "webgpu") return load({ device: "wasm", dtype: "q8" });
        throw error;
      }))
      .catch((error) => { model = null; throw error; });
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
