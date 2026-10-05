import { isConfigured } from "@/lib/replicate";
import { isAuthConfigured, isSignedIn } from "@/lib/ai-auth";

// Lets the UI hide AI features unless the server has both a Replicate
// token and a password, and tells it whether this browser is signed in.
export function GET(request: Request) {
  const configured = isConfigured() && isAuthConfigured();
  return Response.json({ configured, signedIn: configured && isSignedIn(request) });
}
