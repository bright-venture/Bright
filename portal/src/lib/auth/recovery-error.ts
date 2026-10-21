type RecoveryFailure = { code?: string; name?: string; status?: number } | null;

const knownCodes = new Set([
  "pkce_code_verifier_not_found", "bad_code_verifier", "flow_state_not_found", "flow_state_expired",
  "otp_expired", "refresh_token_not_found", "refresh_token_already_used", "session_not_found",
  "session_expired", "bad_jwt", "user_not_found", "user_banned", "email_not_confirmed",
  "unexpected_failure", "request_timeout", "over_request_rate_limit", "validation_failed",
  "invalid_credentials", "no_authorization", "insufficient_aal",
]);

export function recoveryFailureDetails(error: RecoveryFailure, kind: "code" | "session" | "token" | "link") {
  const code = error?.code && knownCodes.has(error.code)
    ? error.code
    : error?.name === "AuthRetryableFetchError" ? "network_error" : error ? "auth_error" : "missing_session";
  const status = typeof error?.status === "number" && Number.isInteger(error.status) && error.status >= 100 && error.status <= 599 ? ` (${error.status})` : "";
  const supportCode = `${kind}/${code}${status}`;
  let message = "Supabase could not verify this recovery link. Share the support code below with your administrator so they can check the cause.";
  if (code === "pkce_code_verifier_not_found" || code === "bad_code_verifier") {
    message = "This email uses a browser-linked recovery method, but this browser does not have the matching verification information. Open it in the browser that requested it. If this was a fresh email from the Bright portal, share the support code below.";
  } else if (["otp_expired", "flow_state_expired", "flow_state_not_found"].includes(code)) {
    message = "Supabase reports that this recovery link has expired or is no longer available. If this was a fresh email, share the support code below before requesting another.";
  } else if (["refresh_token_not_found", "refresh_token_already_used", "session_not_found", "session_expired"].includes(code)) {
    message = "The recovery session is no longer valid. Share the support code below before requesting another email.";
  } else if (code === "user_banned" || code === "user_not_found") {
    message = "This account is unavailable. Your administrator needs to check the account in Supabase.";
  } else if (error?.status === 429) {
    message = "Too many verification attempts. Wait before trying again; you do not need to request another email yet.";
  } else if (code === "network_error" || code === "request_timeout") {
    message = "Could not reach the recovery service. Check your connection, then try Continue again.";
  } else if (error?.status && error.status >= 500) {
    message = "The authentication service could not complete verification. Share the support code below before requesting another email.";
  }
  return { message, supportCode, retryable: code === "network_error" || code === "request_timeout" || error?.status === 429 || (error?.status ?? 0) >= 500 };
}
