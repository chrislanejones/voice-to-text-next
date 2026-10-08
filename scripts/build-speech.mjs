import { build } from "esbuild";
import { mkdir, readdir, copyFile } from "node:fs/promises";
import { createRequire } from "node:module";
import path from "node:path";

const require = createRequire(import.meta.url);
const out = "public/speech";
await mkdir(out, { recursive: true });
await build({
  entryPoints: ["workers/kokoro.worker.ts"],
  outfile: `${out}/kokoro-worker.js`,
  bundle: true,
  format: "esm",
  platform: "browser",
  target: "es2022",
  minify: true,
  legalComments: "linked",
});
// Self-host the exact runtime version used by Transformers.js, so the
// worker doesn't fetch executable code from a CDN at playback time.
const transformerRequire = createRequire(require.resolve("@huggingface/transformers"));
const runtime = path.dirname(transformerRequire.resolve("onnxruntime-web"));
for (const file of await readdir(runtime)) {
  if (file.startsWith("ort-wasm-") && /\.(wasm|mjs)$/.test(file)) {
    await copyFile(path.join(runtime, file), path.join(out, file));
  }
}
console.log("Local speech worker and WebAssembly runtime built.");
