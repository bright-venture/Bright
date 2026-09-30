ALTER TABLE "technician_applications" ADD COLUMN "email" varchar(320);--> statement-breakpoint
ALTER TABLE "technician_applications" ADD COLUMN "experience" varchar(16);--> statement-breakpoint
ALTER TABLE "technician_applications" ADD COLUMN "availability" varchar(16);--> statement-breakpoint
ALTER TABLE "technician_applications" ADD COLUMN "has_tools" boolean;--> statement-breakpoint
ALTER TABLE "technician_applications" ADD COLUMN "has_transport" boolean;--> statement-breakpoint
ALTER TABLE "technician_applications" ADD COLUMN "hired_user_id" integer;--> statement-breakpoint
ALTER TABLE "technician_applications" ADD CONSTRAINT "technician_applications_hired_user_id_users_id_fk" FOREIGN KEY ("hired_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;