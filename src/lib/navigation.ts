/** Only allow same-site relative redirects (blocks "//evil.com" and absolute URLs). */
export function safeNext(raw: string | null) {
  if (!raw || !raw.startsWith("/") || raw.startsWith("//")) return "/";
  return raw;
}
