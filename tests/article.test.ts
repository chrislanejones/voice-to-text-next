import test from "node:test";
import assert from "node:assert/strict";
import { articleUrl, extractArticle, isPublicAddress } from "../lib/article";
import { MAX_ARTICLE_CHARS } from "../lib/article-types";

const paragraphs = [
  "An island green is a small patch of turf surrounded by water. Timber boards hold the bank in place, and a narrow footpath leads golfers to the flag.",
  "Morning light reveals little ripples across the lake. The reflections break as a breeze passes through, leaving the sheltered water by the bank almost still.",
  "The best way to enjoy the course is to take your time. Watch the ball land, listen to the crowd, and follow the path back to the clubhouse when the round ends.",
];
const fixture = `<!doctype html><html lang="en-US"><head><title>A morning on the island</title>
  <meta property="og:site_name" content="Island Journal"></head><body>
  <nav>Menu Home Subscribe Advertisements</nav><main><article><h1>A morning on the island</h1>
  ${paragraphs.map((p) => `<p>${p}</p>`).join("")}<script>window.articleAttack = true;</script>
  </article></main><footer>Newsletter and site links</footer></body></html>`;

test("extracts article paragraphs and metadata without navigation or executable HTML", () => {
  const article = extractArticle(fixture, "https://example.com/island");
  assert.equal(article.title, "A morning on the island");
  assert.equal(article.siteName, "Island Journal");
  assert.equal(article.lang, "en-US");
  assert.equal(article.url, "https://example.com/island");
  for (const paragraph of paragraphs) assert.ok(article.text.includes(paragraph));
  assert.ok(article.text.includes("\n\n"));
  assert.doesNotMatch(article.text, /Advertisements|Newsletter|articleAttack|<script>/);
  assert.equal(article.truncated, false);
});

test("decodes article text entities", () => {
  const article = extractArticle(fixture.replace("Timber boards", "Timber &amp; stone"), "https://example.com/story");
  assert.match(article.text, /Timber & stone/);
});

test("caps long articles and reports that the text was truncated", () => {
  const html = `<html><head><title>Long story</title></head><body><article>${Array.from({ length: 1000 }, () => `<p>${paragraphs[0]}</p>`).join("")}</article></body></html>`;
  const article = extractArticle(html, "https://example.com/long");
  assert.equal(article.truncated, true);
  assert.ok(article.text.length <= MAX_ARTICLE_CHARS);
});

test("rejects empty pages", () => {
  assert.throws(() => extractArticle("<html><body><nav>Sign in</nav></body></html>", "https://example.com/"), /article|text/i);
});

test("normalizes public links", () => {
  assert.equal(articleUrl(" example.com/story#section ").href, "https://example.com/story");
  assert.equal(articleUrl("https://example.com/story?q=one").search, "?q=one");
});

test("rejects private addresses, credentials, non-web schemes and alternate ports", () => {
  for (const url of ["http://localhost/", "http://127.0.0.1/", "http://2130706433/", "http://0x7f000001/", "http://10.0.0.1/", "http://169.254.169.254/", "http://[::1]/", "http://[::ffff:127.0.0.1]/", "http://[fe80::1]/", "http://[fc00::1]/", "file:///etc/passwd", "javascript:alert(1)", "https://user:secret@example.com/", "https://example.com:3000/", "http://server.internal/", "http://router.local/"]) {
    assert.throws(() => articleUrl(url), Error, url);
  }
});

test("address validation also rejects mapped IPv6 and reserved ranges", () => {
  for (const address of ["127.0.0.1", "192.168.2.1", "172.16.0.1", "169.254.169.254", "100.64.0.1", "0.0.0.0", "224.0.0.1", "::", "::1", "::ffff:10.0.0.1", "fc00::1", "fe80::1", "2001:db8::1", "not-an-ip"]) assert.equal(isPublicAddress(address), false, address);
  assert.equal(isPublicAddress("93.184.216.34"), true);
  assert.equal(isPublicAddress("2606:4700:4700::1111"), true);
});
