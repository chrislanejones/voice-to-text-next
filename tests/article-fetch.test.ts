import test from "node:test";
import assert from "node:assert/strict";
import { Response } from "undici";
import { fetchArticle } from "../lib/article";

const publicDns = async () => [{ address: "93.184.216.34", family: 4 }];

test("rejects a public page redirecting to a private address before requesting it", async () => {
  const requested: string[] = [];
  await assert.rejects(fetchArticle("https://example.com/redirect", new AbortController().signal, {
    resolve: publicDns,
    request: async (url) => {
      requested.push(String(url));
      return new Response(null, { status: 302, headers: { location: "http://127.0.0.1/secret" } });
    },
  }), /public/i);
  assert.deepEqual(requested, ["https://example.com/redirect"]);
});

test("checks DNS again for each redirected hostname", async () => {
  const requested: string[] = [], resolved: string[] = [];
  await assert.rejects(fetchArticle("https://example.com/start", new AbortController().signal, {
    resolve: async (host) => {
      resolved.push(host);
      return [{ address: host === "example.com" ? "93.184.216.34" : "10.0.0.1", family: 4 }];
    },
    request: async (url) => {
      requested.push(String(url));
      return new Response(null, { status: 302, headers: { location: "https://destination.example/story" } });
    },
  }), /private/i);
  assert.deepEqual(resolved, ["example.com", "destination.example"]);
  assert.equal(requested.length, 1);
});

test("rejects a DNS answer mixing public and private addresses", async () => {
  let requested = false;
  await assert.rejects(fetchArticle("https://example.com/", new AbortController().signal, {
    resolve: async () => [{ address: "93.184.216.34", family: 4 }, { address: "::ffff:127.0.0.1", family: 6 }],
    request: async () => { requested = true; return new Response(); },
  }), /private/i);
  assert.equal(requested, false);
});

test("limits oversized HTML even when Content-Length is absent", async () => {
  await assert.rejects(fetchArticle("https://example.com/", new AbortController().signal, {
    resolve: publicDns,
    request: async () => new Response("a".repeat(2_000_001), { headers: { "content-type": "text/html" } }),
  }), /large/i);
});

test("stops a redirect loop", async () => {
  let requests = 0;
  await assert.rejects(fetchArticle("https://example.com/loop", new AbortController().signal, {
    resolve: publicDns,
    request: async () => { requests++; return new Response(null, { status: 302, headers: { location: "/loop" } }); },
  }), /redirects/i);
  assert.equal(requests, 5);
});
