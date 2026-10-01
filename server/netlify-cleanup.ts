import { purgeRejectedDocuments } from "./jobs/purgeRejectedDocuments";

// Netlify Scheduled Function (daily; schedule set in netlify.toml). Scheduled
// functions can't be called by URL in production, so this isn't publicly triggerable.
export default async function handler(): Promise<Response> {
  const result = await purgeRejectedDocuments();
  console.log("[cleanup] rejected-applicant documents", result);
  return Response.json(result);
}
