import test from "node:test";
import assert from "node:assert/strict";
import { CLOUD_LANGUAGES, CLOUD_VOICES, cloudVoiceFor } from "../lib/cloud-voices";

test("lists Replicate's Kokoro voices once each, each with a known language", () => {
  assert.equal(CLOUD_VOICES.length, 46);
  assert.equal(new Set(CLOUD_VOICES.map((v) => v.id)).size, CLOUD_VOICES.length);
  for (const voice of CLOUD_VOICES) assert.ok(voice.lang in CLOUD_LANGUAGES, voice.id);
  assert.ok(CLOUD_VOICES.some((v) => v.id === "zm_yunxi"));
  assert.ok(CLOUD_VOICES.some((v) => v.id === "zf_xiaoxiao"));
});

test("keeps the chosen voice when it reads the article's language", () => {
  assert.equal(cloudVoiceFor("en-US", "bm_george")?.id, "bm_george");
});

test("switches to a voice for the article's language", () => {
  assert.equal(cloudVoiceFor("fr", "af_bella")?.id, "ff_siwis");
  assert.equal(cloudVoiceFor("ja-JP", "af_bella")?.lang, "ja");
});

test("has no voice for languages Kokoro doesn't read", () => {
  assert.equal(cloudVoiceFor("de", "af_bella"), undefined);
});
