import "dotenv/config";
import { defineConfig } from "drizzle-kit";

export default defineConfig({
  schema: "./db/schema.ts",
  out: "./db/migrations",
  dialect: "postgresql",
  dbCredentials: {
    // Use the direct / session connection string (port 5432) for migrations.
    url: process.env.DIRECT_DATABASE_URL || process.env.DATABASE_URL || "",
  },
});
