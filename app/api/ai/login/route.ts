import { checkPassword, clearedCookie, isAuthConfigured, sessionCookie } from "@/lib/ai-auth";

// Sign in to the AI tools with AI_PASSWORD.
export async function POST(request: Request) {
  if (!isAuthConfigured()) {
    return Response.json({ error: "AI sign-in isn't set up on this server." }, { status: 503 });
  }
  const body = (await request.json().catch(() => null)) as { password?: unknown } | null;
  const attempt = typeof body?.password === "string" ? body.password : "";
  if (!checkPassword(attempt)) {
    // Slow down guessing.
    await new Promise((resolve) => setTimeout(resolve, 800));
    return Response.json({ error: "That password isn't right." }, { status: 401 });
  }
  return Response.json({ signedIn: true }, { headers: { "Set-Cookie": sessionCookie() } });
}

// Sign out.
export function DELETE() {
  return Response.json({ signedIn: false }, { headers: { "Set-Cookie": clearedCookie() } });
}
