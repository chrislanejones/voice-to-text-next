import { isConfigured } from "@/lib/replicate";

// Lets the UI hide AI features when the server has no token.
export function GET() {
  return Response.json({ configured: isConfigured() });
}
