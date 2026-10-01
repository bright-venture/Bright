ALTER TABLE "technician_applications" ADD COLUMN "consent_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "technician_applications" ADD COLUMN "consent_version" varchar(32);--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "terms_accepted_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "terms_version" varchar(32);