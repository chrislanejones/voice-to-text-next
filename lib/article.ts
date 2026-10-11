import { lookup } from "node:dns/promises";
import { isIP } from "node:net";
import { Readability } from "@mozilla/readability";
import { JSDOM } from "jsdom";
import ipaddr from "ipaddr.js";
import { Agent, fetch } from "undici";
import { MAX_ARTICLE_CHARS, type Article } from "./article-types";

const MAX_HTML_BYTES = 2_000_000;
const REDIRECTS = new Set([301, 302, 303, 307, 308]);

export class ArticleError extends Error {
  constructor(message: string, public readonly status = 422) {
    super(message);
  }
}

export function isPublicAddress(address: string): boolean {
  try {
    // process() also normalizes IPv4-mapped IPv6, such as ::ffff:127.0.0.1.
    return ipaddr.process(address).range() === "unicast";
  } catch {
    return false;
  }
}

export function articleUrl(input: string): URL {
  let url: URL;
  try {
    const value = input.trim();
    if (!value || value.length > 2048) throw new Error();
    url = new URL(/^[a-z][a-z\d+.-]*:/i.test(value) ? value : `https://${value}`);
  } catch {
    throw new ArticleError("Paste a complete article link, such as https://example.com/story.", 400);
  }
  const host = url.hostname.replace(/^\[|\]$/g, "");
  if (
    !["http:", "https:"].includes(url.protocol) || url.username || url.password ||
    (url.port && !["80", "443"].includes(url.port)) ||
    (!isIP(host) && (!host.includes(".") || /(?:^|\.)(localhost|local|internal|home|test|invalid)$/.test(host))) ||
    (isIP(host) && !isPublicAddress(host))
  ) {
    throw new ArticleError("Use a public http or https article link.", 400);
  }
  url.hash = "";
  return url;
}

export function extractArticle(html: string, url: string): Article {
  // Default JSDOM settings execute no scripts and fetch no page resources.
  const dom = new JSDOM(html, { url });
  try {
    const document = dom.window.document;
    const lang = document.documentElement.lang || "en";
    const result = new Readability(document, { charThreshold: 100, maxElemsToParse: 40_000 }).parse();
    if (!result?.content) throw new ArticleError("Couldn't find an article on that page. Try pasting its text below.");
    const container = document.createElement("div");
    container.innerHTML = result.content;
    const blocks = Array.from(container.querySelectorAll("p, h2, h3, h4, li, pre, blockquote"))
      .filter((el) => !el.querySelector("p, h2, h3, h4, li, pre, blockquote"))
      .map((el) => (el.textContent ?? "").replace(/\s+/g, " ").trim())
      .filter(Boolean);
    let text = (blocks.length ? blocks.join("\n\n") : result.textContent ?? "").trim();
    if (text.length < 100) throw new ArticleError("That page has too little readable text. Try pasting the article below.");
    const truncated = text.length > MAX_ARTICLE_CHARS;
    if (truncated) text = text.slice(0, MAX_ARTICLE_CHARS).replace(/\s+\S*$/, "");
    return {
      title: result.title?.trim() || "Untitled article",
      url,
      siteName: result.siteName || new URL(url).hostname,
      byline: result.byline?.trim() || "",
      lang,
      text,
      wordCount: text.split(/\s+/).length,
      truncated,
    };
  } finally {
    dom.window.close();
  }
}

interface ArticleTransport {
  resolve: (host: string) => Promise<{ address: string; family: number }[]>;
  request: typeof fetch;
}

export async function fetchArticle(input: string, signal: AbortSignal, transport: ArticleTransport = {
  resolve: (host) => lookup(host, { all: true }),
  request: fetch,
}): Promise<Article> {
  let url = articleUrl(input);
  for (let redirects = 0; redirects <= 4; redirects++) {
    signal.throwIfAborted();
    const host = url.hostname.replace(/^\[|\]$/g, "");
    const addresses = isIP(host)
      ? [{ address: host, family: isIP(host) }]
      : await transport.resolve(host);
    signal.throwIfAborted();
    if (!addresses.length || addresses.some(({ address }) => !isPublicAddress(address))) {
      throw new ArticleError("Use a public article link. Private network addresses aren't supported.", 400);
    }
    const selected = addresses.find((a) => a.family === 4) ?? addresses[0];
    // Pin the validated DNS answer for the connection as well as checking
    // every redirect. A second DNS resolution must not reach a private IP.
    const agent = new Agent({ connect: {
      autoSelectFamily: false,
      lookup: (_host, _options, callback) => callback(null, selected.address, selected.family),
    } });
    try {
      const response = await transport.request(url, {
        dispatcher: agent,
        signal,
        redirect: "manual",
        headers: { "Accept": "text/html, application/xhtml+xml", "User-Agent": "VoiceToTextArticleReader/1.0" },
      });
      if (REDIRECTS.has(response.status)) {
        await response.body?.cancel();
        const location = response.headers.get("location");
        if (!location || redirects === 4) throw new ArticleError("That link redirects too many times. Try the article's direct link.");
        url = articleUrl(new URL(location, url).href);
        continue;
      }
      if (!response.ok) {
        await response.body?.cancel();
        throw new ArticleError("That site wouldn't share its article. Try pasting the text below.");
      }
      if (!/text\/html|application\/xhtml\+xml/i.test(response.headers.get("content-type") ?? "")) {
        await response.body?.cancel();
        throw new ArticleError("That link isn't a web article. Paste the article text below instead.");
      }
      const length = Number(response.headers.get("content-length") ?? 0);
      if (length > MAX_HTML_BYTES) {
        await response.body?.cancel();
        throw new ArticleError("That page is too large to load. Paste the article text below instead.", 413);
      }
      const reader = response.body?.getReader();
      if (!reader) throw new ArticleError("That site returned an empty page.");
      const decoder = new TextDecoder();
      let html = "", bytes = 0;
      try {
        while (true) {
          const { value, done } = await reader.read();
          if (done) break;
          bytes += value.byteLength;
          if (bytes > MAX_HTML_BYTES) {
            await reader.cancel();
            throw new ArticleError("That page is too large to load. Paste the article text below instead.", 413);
          }
          html += decoder.decode(value, { stream: true });
        }
        html += decoder.decode();
      } finally {
        reader.releaseLock();
      }
      return extractArticle(html, url.href);
    } finally {
      await agent.close();
    }
  }
  throw new ArticleError("Couldn't follow that article link.");
}
