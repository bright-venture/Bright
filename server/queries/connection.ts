import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { env } from "../lib/env";
import * as schema from "@db/schema";
import * as relations from "@db/relations";

const fullSchema = { ...schema, ...relations };

let instance: ReturnType<typeof drizzle<typeof fullSchema>>;

/**
 * A serverless instance (Netlify runs on AWS Lambda) serves one request at a time, and
 * there may be many instances: a few connections each is enough and keeps the database's
 * connection limit free. A long-running Node server shares one pool across all requests.
 */
const serverless = !!process.env.AWS_LAMBDA_FUNCTION_NAME;

export function getDb() {
  if (!instance) {
    const client = postgres(env.databaseUrl, {
      prepare: false, // compatible with Supabase's transaction pooler (port 6543)
      max: serverless ? 3 : 10, // 3: a request runs up to 4 queries at once
      idle_timeout: serverless ? 20 : 0, // seconds; frozen instances shouldn't hold connections
      connect_timeout: 10,
    });
    instance = drizzle(client, { schema: fullSchema });
  }
  return instance;
}
