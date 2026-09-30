CREATE TYPE "public"."application_status" AS ENUM('new', 'contacted', 'hired', 'rejected');--> statement-breakpoint
CREATE TYPE "public"."request_status" AS ENUM('submitted', 'in_review', 'quote_ready', 'approved', 'scheduled', 'in_progress', 'completed', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."urgency_level" AS ENUM('normal', 'priority', 'urgent', 'critical');--> statement-breakpoint
CREATE TYPE "public"."user_role" AS ENUM('user', 'admin', 'technician');--> statement-breakpoint
CREATE TABLE "request_events" (
	"id" serial PRIMARY KEY NOT NULL,
	"request_id" integer NOT NULL,
	"status" varchar(32) NOT NULL,
	"note" text,
	"actor_id" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "request_events" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "request_media" (
	"id" serial PRIMARY KEY NOT NULL,
	"request_id" integer NOT NULL,
	"key" varchar(512) NOT NULL,
	"file_name" varchar(512) NOT NULL,
	"size" bigint NOT NULL,
	"content_type" varchar(128),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "request_media_key_unique" UNIQUE("key")
);
--> statement-breakpoint
ALTER TABLE "request_media" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "service_requests" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"technician_id" integer,
	"category" varchar(64) NOT NULL,
	"answers" text NOT NULL,
	"urgency_suggested" "urgency_level" NOT NULL,
	"urgency_final" "urgency_level",
	"status" "request_status" DEFAULT 'submitted' NOT NULL,
	"preferred_date" varchar(32) NOT NULL,
	"time_slot" varchar(32) NOT NULL,
	"area" varchar(255) NOT NULL,
	"address" text NOT NULL,
	"phone" varchar(64) NOT NULL,
	"notes" text,
	"quote_amount" varchar(32),
	"quote_note" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "service_requests" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "technician_applications" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(255) NOT NULL,
	"phone" varchar(64) NOT NULL,
	"trade" varchar(64) NOT NULL,
	"area" varchar(255) NOT NULL,
	"notes" text,
	"status" "application_status" DEFAULT 'new' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "technician_applications" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "technician_locations" (
	"id" serial PRIMARY KEY NOT NULL,
	"request_id" integer NOT NULL,
	"technician_id" integer NOT NULL,
	"lat" varchar(32) NOT NULL,
	"lng" varchar(32) NOT NULL,
	"accuracy" varchar(16),
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "technician_locations_request_id_unique" UNIQUE("request_id")
);
--> statement-breakpoint
ALTER TABLE "technician_locations" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "users" (
	"id" serial PRIMARY KEY NOT NULL,
	"auth_id" uuid NOT NULL,
	"name" varchar(255),
	"email" varchar(320),
	"avatar" text,
	"role" "user_role" DEFAULT 'user' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"last_sign_in_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "users_auth_id_unique" UNIQUE("auth_id")
);
--> statement-breakpoint
ALTER TABLE "users" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "request_events" ADD CONSTRAINT "request_events_request_id_service_requests_id_fk" FOREIGN KEY ("request_id") REFERENCES "public"."service_requests"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "request_events" ADD CONSTRAINT "request_events_actor_id_users_id_fk" FOREIGN KEY ("actor_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "request_media" ADD CONSTRAINT "request_media_request_id_service_requests_id_fk" FOREIGN KEY ("request_id") REFERENCES "public"."service_requests"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "service_requests" ADD CONSTRAINT "service_requests_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "service_requests" ADD CONSTRAINT "service_requests_technician_id_users_id_fk" FOREIGN KEY ("technician_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "technician_locations" ADD CONSTRAINT "technician_locations_request_id_service_requests_id_fk" FOREIGN KEY ("request_id") REFERENCES "public"."service_requests"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "technician_locations" ADD CONSTRAINT "technician_locations_technician_id_users_id_fk" FOREIGN KEY ("technician_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "request_events_request_idx" ON "request_events" USING btree ("request_id");--> statement-breakpoint
CREATE INDEX "request_media_request_idx" ON "request_media" USING btree ("request_id");--> statement-breakpoint
CREATE INDEX "service_requests_user_idx" ON "service_requests" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "service_requests_technician_idx" ON "service_requests" USING btree ("technician_id");