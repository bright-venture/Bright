import app from "./app";

const FUNCTION_PREFIX = "/.netlify/functions/api";

// Netlify Functions (v2) entry; bundled by scripts/build-netlify.mjs.
// netlify.toml rewrites /api/* here. Depending on how the request arrives, the URL
// may carry the internal function path, so map it back to /api/* before routing.
export default async function handler(req: Request): Promise<Response> {
  const url = new URL(req.url);
  if (url.pathname.startsWith(FUNCTION_PREFIX)) {
    url.pathname = "/api" + url.pathname.slice(FUNCTION_PREFIX.length);
    req = new Request(url, {
      method: req.method,
      headers: req.headers,
      body: req.body,
      duplex: "half", // required by Node when forwarding a streamed body
    } as RequestInit);
  }
  return app.fetch(req);
}
