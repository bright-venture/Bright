import {
  pgTable,
  pgEnum,
  serial,
  integer,
  bigint,
  varchar,
  text,
  timestamp,
  uuid,
  index,
  boolean,
  doublePrecision,
} from "drizzle-orm/pg-core";

// Every table enables Row Level Security with no policies. The app server talks to
// Postgres directly (bypassing RLS), while Supabase's public REST API — reachable with
// the browser's publishable key — gets no access to these tables at all.

export const userRole = pgEnum("user_role", ["customer", "specialist", "technician"]);
export const urgencyLevel = pgEnum("urgency_level", [
  "normal",
  "priority",
  "urgent",
  "critical",
]);
export const requestStatus = pgEnum("request_status", [
  "submitted",
  "in_review",
  "quote_ready",
  "approved",
  "scheduled",
  "in_progress",
  "completed",
  "cancelled",
]);
export const applicationStatus = pgEnum("application_status", [
  "new",
  "contacted",
  "hired",
  "rejected",
]);

const timestamps = {
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .notNull()
    .$onUpdate(() => new Date()),
};

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  /** Supabase auth.users.id */
  authId: uuid("auth_id").notNull().unique(),
  name: varchar("name", { length: 255 }),
  email: varchar("email", { length: 320 }),
  /** Given at sign-up; pre-fills bookings. */
  phone: varchar("phone", { length: 64 }),
  avatar: text("avatar"),
  role: userRole("role").default("customer").notNull(),
  ...timestamps,
  lastSignInAt: timestamp("last_sign_in_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
}).enableRLS();

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

export const serviceRequests = pgTable(
  "service_requests",
  {
    id: serial("id").primaryKey(),
    userId: integer("user_id")
      .notNull()
      .references(() => users.id),
    technicianId: integer("technician_id").references(() => users.id),
    category: varchar("category", { length: 64 }).notNull(),
    answers: text("answers").notNull(), // JSON: Record<string, string>
    urgencySuggested: urgencyLevel("urgency_suggested").notNull(),
    urgencyFinal: urgencyLevel("urgency_final"),
    status: requestStatus("status").default("submitted").notNull(),
    preferredDate: varchar("preferred_date", { length: 32 }).notNull(),
    timeSlot: varchar("time_slot", { length: 32 }).notNull(),
    area: varchar("area", { length: 255 }).notNull(),
    address: text("address").notNull(),
    /** Map pin dropped by the customer (required for new requests). */
    lat: doublePrecision("lat"),
    lng: doublePrecision("lng"),
    phone: varchar("phone", { length: 64 }).notNull(),
    notes: text("notes"),
    quoteAmount: varchar("quote_amount", { length: 32 }),
    quoteNote: text("quote_note"),
    ...timestamps,
  },
  (t) => [
    index("service_requests_user_idx").on(t.userId),
    index("service_requests_technician_idx").on(t.technicianId),
  ],
).enableRLS();

export type ServiceRequest = typeof serviceRequests.$inferSelect;

export const requestMedia = pgTable(
  "request_media",
  {
    id: serial("id").primaryKey(),
    requestId: integer("request_id")
      .notNull()
      .references(() => serviceRequests.id, { onDelete: "cascade" }),
    /** Object path inside the Supabase Storage bucket */
    key: varchar("key", { length: 512 }).notNull().unique(),
    fileName: varchar("file_name", { length: 512 }).notNull(),
    size: bigint("size", { mode: "number" }).notNull(),
    contentType: varchar("content_type", { length: 128 }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [index("request_media_request_idx").on(t.requestId)],
).enableRLS();

export const requestEvents = pgTable(
  "request_events",
  {
    id: serial("id").primaryKey(),
    requestId: integer("request_id")
      .notNull()
      .references(() => serviceRequests.id, { onDelete: "cascade" }),
    status: varchar("status", { length: 32 }).notNull(),
    note: text("note"),
    actorId: integer("actor_id").references(() => users.id),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [index("request_events_request_idx").on(t.requestId)],
).enableRLS();

/** Public "apply as a technician" submissions (no login required). */
export const technicianApplications = pgTable("technician_applications", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  phone: varchar("phone", { length: 64 }).notNull(),
  trade: varchar("trade", { length: 64 }).notNull(),
  area: varchar("area", { length: 255 }).notNull(),
  notes: text("notes"),
  /** Contact + login email; required for new applications (older ones may lack it). */
  email: varchar("email", { length: 320 }),
  /** See contracts/applications.ts for the allowed values. */
  experience: varchar("experience", { length: 16 }),
  availability: varchar("availability", { length: 16 }),
  hasTools: boolean("has_tools"),
  hasTransport: boolean("has_transport"),
  /** Private storage keys (technician-docs bucket); required for new applications. */
  idDocumentKey: varchar("id_document_key", { length: 512 }),
  criminalRecordKey: varchar("criminal_record_key", { length: 512 }),
  photoKey: varchar("photo_key", { length: 512 }),
  status: applicationStatus("status").default("new").notNull(),
  /** The technician account created or promoted when the applicant was hired. */
  hiredUserId: integer("hired_user_id").references(() => users.id),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
}).enableRLS();

export type TechnicianApplication = typeof technicianApplications.$inferSelect;

/** Latest known technician position per request (one row per request). */
export const technicianLocations = pgTable("technician_locations", {
  id: serial("id").primaryKey(),
  requestId: integer("request_id")
    .notNull()
    .unique()
    .references(() => serviceRequests.id, { onDelete: "cascade" }),
  technicianId: integer("technician_id")
    .notNull()
    .references(() => users.id),
  lat: varchar("lat", { length: 32 }).notNull(),
  lng: varchar("lng", { length: 32 }).notNull(),
  accuracy: varchar("accuracy", { length: 16 }),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .notNull()
    .$onUpdate(() => new Date()),
}).enableRLS();
