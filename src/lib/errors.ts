import { TRPCClientError } from "@trpc/client";

/** The server refused because of a rate limit (see server/lib/rateLimit.ts). */
export function isRateLimited(error: unknown) {
  return error instanceof TRPCClientError && error.data?.code === "TOO_MANY_REQUESTS";
}

/** The request never got an answer (offline, server unreachable). */
export function isNetworkError(error: unknown) {
  return error instanceof TRPCClientError && !error.data;
}

/**
 * The server's explanation for refusing, when it was written for people
 * ("Choose a date from today onwards"). Input-validation dumps (JSON) and
 * unexpected crashes return null, so callers fall back to their own wording.
 */
export function refusalMessage(error: unknown) {
  if (!(error instanceof TRPCClientError)) return null;
  if (!["BAD_REQUEST", "FORBIDDEN", "NOT_FOUND"].includes(error.data?.code)) return null;
  const message = error.message.trim();
  return message && !/^[[{]/.test(message) ? message : null;
}
