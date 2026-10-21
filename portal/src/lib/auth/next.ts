// Where to send someone after sign-in. Only in-app portal and machine-report
// paths are allowed, so a crafted ?next= link can never redirect off-site.
const ALLOWED_NEXT = /^\/(?:portal(?:\?section=[A-Za-z]+)?|m\/[0-9a-f-]{36}(?:\?(?:view=current|new=1))?)$/i;

export function safeNext(value: unknown): string | null {
  return typeof value === "string" && ALLOWED_NEXT.test(value) ? value : null;
}

export function withNext(path: "/login" | "/auth/mfa", next: string | null | undefined): string {
  const safe = safeNext(next);
  return safe ? `${path}?next=${encodeURIComponent(safe)}` : path;
}
