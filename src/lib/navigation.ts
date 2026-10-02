/** Backslashes and control characters, which browsers can turn into "//evil.com". */
// eslint-disable-next-line no-control-regex -- control characters are exactly what's blocked
const UNSAFE = /[\\\u0000-\u001f]/;

/** Only allow same-site relative redirects (blocks "//evil.com", absolute URLs and the above). */
export function safeNext(raw: string | null) {
  if (!raw || !raw.startsWith("/") || raw.startsWith("//") || UNSAFE.test(raw)) return "/";
  return raw;
}
