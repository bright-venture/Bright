ALTER TABLE "service_requests" ADD COLUMN "prep_diagnosis" text;--> statement-breakpoint
ALTER TABLE "service_requests" ADD COLUMN "prep_tools" text;--> statement-breakpoint
ALTER TABLE "service_requests" ADD COLUMN "prep_parts" text;--> statement-breakpoint
ALTER TABLE "service_requests" ADD COLUMN "prep_instructions" text;--> statement-breakpoint
ALTER TABLE "service_requests" ADD COLUMN "prepared_at" timestamp with time zone;