// Company details and document versions used by the Terms, Privacy Policy and sign-up.
// TODO before launch: replace the bracketed values with Bright's registered details.

export const COMPANY = {
  brand: "Be Right by Bright",
  legalName: "[Company legal name, as registered in Lebanon]",
  address: "[Registered address], Lebanon",
  email: "hello@be-rightbright.com",
  privacyEmail: "privacy@be-rightbright.com",
  website: "be-rightbright.com",
} as const;

/**
 * Bump when the Terms or Privacy Policy change materially; accounts record the
 * version they accepted, so you can ask for re-acceptance later.
 */
export const LEGAL_VERSION = "2026-10-02";

/** Days a customer has to report a problem with completed work ("we come back"). */
export const WORKMANSHIP_GUARANTEE_DAYS = 30;

/** Days after a rejected application before its documents are deleted. */
export const REJECTED_APPLICATION_RETENTION_DAYS = 90;
