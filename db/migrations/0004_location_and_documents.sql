ALTER TABLE "service_requests" ADD COLUMN "lat" double precision;--> statement-breakpoint
ALTER TABLE "service_requests" ADD COLUMN "lng" double precision;--> statement-breakpoint
ALTER TABLE "technician_applications" ADD COLUMN "id_document_key" varchar(512);--> statement-breakpoint
ALTER TABLE "technician_applications" ADD COLUMN "criminal_record_key" varchar(512);--> statement-breakpoint
ALTER TABLE "technician_applications" ADD COLUMN "photo_key" varchar(512);