import { ArticleError, fetchArticle } from "@/lib/article";

export const runtime = "nodejs";
export const maxDuration = 30;

export async function POST(request: Request) {
  const origin = request.headers.get("origin");
  if (origin) {
    // Next can construct request.url from its 0.0.0.0 bind address. Compare
    // the browser origin to the requested Host, not that listening address.
    const host = request.headers.get("host") ?? new URL(request.url).host;
    let sameHost = false;
    try { sameHost = new URL(origin).host.toLowerCase() === host.toLowerCase(); } catch { /* Invalid origin. */ }
    if (!sameHost) return Response.json({ error: "Open the article reader in this app." }, { status: 403 });
  }
  const body = await request.text();
  if (body.length > 4096) return Response.json({ error: "That article link is too long." }, { status: 413 });
  let input: { url?: unknown };
  try { input = JSON.parse(body); } catch { input = {}; }
  if (typeof input?.url !== "string") {
    return Response.json({ error: "Paste an article link first." }, { status: 400 });
  }
  try {
    const article = await fetchArticle(input.url, AbortSignal.any([request.signal, AbortSignal.timeout(15_000)]));
    return Response.json(article, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    const message = error instanceof ArticleError ? error.message
      : error instanceof Error && ["TimeoutError", "AbortError"].includes(error.name)
        ? "The site took too long to respond. Try again or paste the article text."
        : "Couldn't reach that article. Check the link, or paste its text below.";
    return Response.json({ error: message }, { status: error instanceof ArticleError ? error.status : 502 });
  }
}
