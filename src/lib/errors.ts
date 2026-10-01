import { TRPCClientError } from "@trpc/client";

/** The server refused because of a rate limit (see server/lib/rateLimit.ts). */
export function isRateLimited(error: unknown) {
  return error instanceof TRPCClientError && error.data?.code === "TOO_MANY_REQUESTS";
}
