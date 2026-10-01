import "dotenv/config";

function required(name: string): string {
  const value = process.env[name];
  if (!value && process.env.NODE_ENV === "production") {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value ?? "";
}

export const env = {
  isProduction: process.env.NODE_ENV === "production",
  databaseUrl: required("DATABASE_URL"),
  supabaseUrl: required("SUPABASE_URL"),
  supabaseServiceRoleKey: required("SUPABASE_SERVICE_ROLE_KEY"),
  storageBucket: process.env.SUPABASE_STORAGE_BUCKET || "request-media",
  /** Private bucket for technician ID, criminal record and profile photo. */
  docsBucket: process.env.SUPABASE_DOCS_BUCKET || "technician-docs",
  /** Comma-separated emails that get the specialist role on sign-in (ADMIN_EMAILS is the old name). */
  specialistEmails: (process.env.SPECIALIST_EMAILS || process.env.ADMIN_EMAILS || "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean),
};
