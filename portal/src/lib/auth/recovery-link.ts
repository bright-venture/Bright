// Read only a recovery token, never a caller-supplied redirect destination.
export function recoveryTokenFromFragment(fragment: string): string | null {
  const params = new URLSearchParams(fragment.replace(/^#/, ""));
  if (params.getAll("type").length !== 1 || params.get("type") !== "recovery") return null;
  const tokens = params.getAll("token_hash");
  if (tokens.length !== 1 || !/^[A-Za-z0-9_-]{16,1024}$/.test(tokens[0])) return null;
  return tokens[0];
}

export type RecoveryLink =
  | { kind: "token"; token: string }
  | { kind: "session"; access_token: string; refresh_token: string }
  | { kind: "code"; code: string };

export function recoveryLinkFromUrl(fragment: string, search = ""): RecoveryLink | null {
  const hash = new URLSearchParams(fragment.replace(/^#/, ""));
  const query = new URLSearchParams(search);
  if ([hash, query].some(params => params.has("error") || params.has("error_code"))) return null;
  const token = recoveryTokenFromFragment(fragment);
  if (token && !hash.has("access_token") && !query.has("code")) return { kind: "token", token };
  if (hash.has("token_hash")) return null;
  if (hash.has("access_token") || hash.has("refresh_token")) {
    if (query.has("code") || hash.getAll("type").length !== 1 || hash.get("type") !== "recovery") return null;
    const access = hash.getAll("access_token");
    const refresh = hash.getAll("refresh_token");
    if (access.length !== 1 || refresh.length !== 1 || !/^[A-Za-z0-9_.-]{16,16384}$/.test(access[0]) || !/^[A-Za-z0-9_-]{8,2048}$/.test(refresh[0])) return null;
    return { kind: "session", access_token: access[0], refresh_token: refresh[0] };
  }
  const codes = query.getAll("code");
  if (!fragment && codes.length === 1 && /^[A-Za-z0-9_-]{16,2048}$/.test(codes[0])) return { kind: "code", code: codes[0] };
  return null;
}
