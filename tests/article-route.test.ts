import test from "node:test";
import assert from "node:assert/strict";
import { POST } from "../app/api/article/route";

function request(origin: string) {
  return new Request("http://0.0.0.0:3000/api/article", {
    method: "POST",
    headers: { host: "localhost:3000", origin, "content-type": "application/json" },
    body: JSON.stringify({ url: "http://127.0.0.1" }),
  });
}

test("accepts the browser's requested host when Next uses a different bind address", async () => {
  const response = await POST(request("http://localhost:3000"));
  assert.equal(response.status, 400); // URL validation, rather than the origin rejection.
  assert.match((await response.json()).error, /public/i);
});

test("rejects another site's origin and malformed origins", async () => {
  for (const origin of ["https://other.example", "null", "not a URL"]) {
    assert.equal((await POST(request(origin))).status, 403);
  }
});
