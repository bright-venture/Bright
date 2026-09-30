-- Rename account roles to the names the business uses. Renaming (not recreating)
-- keeps every existing account's role: user → customer, admin → specialist.
ALTER TYPE "public"."user_role" RENAME VALUE 'user' TO 'customer';--> statement-breakpoint
ALTER TYPE "public"."user_role" RENAME VALUE 'admin' TO 'specialist';--> statement-breakpoint
ALTER TABLE "users" ALTER COLUMN "role" SET DEFAULT 'customer';
