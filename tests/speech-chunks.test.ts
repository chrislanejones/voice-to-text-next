import test from "node:test";
import assert from "node:assert/strict";
import { speechChunks } from "../lib/speech-chunks";

test("keeps long articles in short utterances without losing any words", () => {
  const text = Array.from({ length: 500 }, (_, i) => `Passage ${i} follows the path around the lake. The breeze carries a quiet ripple toward the bank.`).join("\n\n");
  const chunks = speechChunks(text);
  assert.ok(chunks.length > 100);
  assert.equal(chunks.map((c) => c.text).join(" ").replace(/\s+/g, " "), text.replace(/\s+/g, " "));
  for (const chunk of chunks) {
    assert.ok(chunk.text.length <= 220);
    assert.equal(chunk.text, text.slice(chunk.start, chunk.end).trim());
    assert.ok(chunk.end > chunk.start);
  }
});

test("handles whitespace, a long unbroken word, and Unicode text", () => {
  assert.deepEqual(speechChunks(" \n\t "), []);
  const text = "Hello.\n\n" + "a".repeat(900) + "\n\nCafé, 日本語, and a final sentence!";
  const chunks = speechChunks(text);
  assert.equal(chunks.map((c) => c.text).join("").replace(/\s/g, ""), text.replace(/\s/g, ""));
  assert.ok(chunks.every((c) => c.text.length <= 220));
});
