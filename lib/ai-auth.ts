// Server-only: the password gate in front of the AI routes. AI spends the
// owner's Replicate credit, so only someone who knows AI_PASSWORD gets a
// session. The session is a signed cookie: "<expiry>.<hmac>". The HMAC key
// is the password itself, so changing the password signs everyone out.

import { createHmac, timingSafeEqual } from "node:crypto";

const COOKIE = "vt_ai_session";
const MAX_AGE_S = 30 * 24 * 60 * 60;

function password(): string | undefined {
  return process.env.AI_PASSWORD || undefined;
}

export function isAuthConfigured(): boolean {
  return Boolean(password());
}

function sign(value: string, key: string): string {
  return createHmac("sha256", key).update(value).digest("base64url");
}

// Compare digests so the comparison takes the same time whatever the
// input length.
function safeEqual(a: string, b: string): boolean {
  const da = createHmac("sha256", "cmp").update(a).digest();
  const db = createHmac("sha256", "cmp").update(b).digest();
  return timingSafeEqual(da, db);
}

export function checkPassword(attempt: string): boolean {
  const key = password();
  return Boolean(key) && safeEqual(attempt, key!);
}

function readCookie(request: Request): string | undefined {
  const header = request.headers.get("cookie") ?? "";
  for (const part of header.split(";")) {
    const [name, ...rest] = part.trim().split("=");
    if (name === COOKIE) return rest.join("=");
  }
  return undefined;
}

export function isSignedIn(request: Request): boolean {
  const key = password();
  const value = readCookie(request);
  if (!key || !value) return false;
  const [expiry, mac] = value.split(".");
  if (!expiry || !mac || Number(expiry) < Date.now()) return false;
  return safeEqual(mac, sign(expiry, key));
}

function cookie(value: string, maxAge: number): string {
  const secure = process.env.NODE_ENV === "production" ? "; Secure" : "";
  return `${COOKIE}=${value}; Path=/api/ai; HttpOnly; SameSite=Strict; Max-Age=${maxAge}${secure}`;
}

export function sessionCookie(): string {
  const expiry = String(Date.now() + MAX_AGE_S * 1000);
  return cookie(`${expiry}.${sign(expiry, password()!)}`, MAX_AGE_S);
}

export function clearedCookie(): string {
  return cookie("", 0);
}

// Returns a 401 response when the request has no valid session.
export function requireSignIn(request: Request): Response | null {
  if (isSignedIn(request)) return null;
  return Response.json({ error: "Sign in to use AI tools." }, { status: 401 });
}
