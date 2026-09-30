// Business rules and input validation that the happy-path workflow test doesn't cover.
import { beforeAll, describe, expect, it, vi } from "vitest";
import type { User } from "@db/schema";
import { ADMIN_EMAIL, callerFor, createTestDb, futureDate, makeUser } from "./test/harness";

const state = vi.hoisted(() => ({ db: undefined as unknown }));
vi.mock("./queries/connection", () => ({ getDb: () => state.db }));
vi.mock("./lib/env", () => ({
  env: {
    isProduction: false,
    databaseUrl: "",
    supabaseUrl: "",
    supabaseServiceRoleKey: "",
    storageBucket: "test",
    adminEmails: ["specialist@example.com"],
  },
}));
vi.mock("./lib/storage", () => ({
  MAX_UPLOAD_BYTES: 20 * 1024 * 1024,
  userUploadPrefix: (authId: string) => `requests/${authId}/`,
  createUploadUrl: async () => ({ key: "k", token: "t" }),
  createSignedUrls: async () => ({}),
}));

const base = {
  category: "plumbing",
  answers: { problem: "fixture" },
  preferredDate: futureDate(),
  timeSlot: "morning" as const,
  area: "Hamra",
  address: "Street 1",
  phone: "+961 70 000 000",
  media: [],
};

let admin: User, customer: User, tech: User;

beforeAll(async () => {
  state.db = await createTestDb();
  admin = await makeUser(ADMIN_EMAIL);
  customer = await makeUser("customer@example.com");
  tech = await makeUser("tech@example.com");
  await (await callerFor(admin)).tech.addByEmail({ email: "tech@example.com" });
  tech = { ...tech, role: "technician" };
}, 60_000);

/** Books a request and walks it to "approved" (quote accepted). */
async function approvedRequest() {
  const c = await callerFor(customer);
  const s = await callerFor(admin);
  const { id } = await c.requests.create(base);
  await s.admin.startReview({ id, urgency: "normal" });
  await s.admin.sendQuote({ id, amount: "30" });
  await c.requests.approveQuote({ id });
  return id;
}

const rejected = (p: Promise<unknown>, code = "BAD_REQUEST") =>
  expect(p).rejects.toMatchObject({ code });

describe("booking validation", () => {
  it("requires a real date from today onwards", async () => {
    const c = await callerFor(customer);
    await rejected(c.requests.create({ ...base, preferredDate: "banana" }));
    await rejected(c.requests.create({ ...base, preferredDate: "2020-01-01" }));
    await rejected(c.requests.create({ ...base, preferredDate: "2026-02-30" }));
  });

  it("only accepts answers to the category's own questions", async () => {
    const c = await callerFor(customer);
    await rejected(c.requests.create({ ...base, answers: { problem: "fixture", junk: "y" } }));
    await rejected(c.requests.create({ ...base, answers: { problem: "not-an-option" } }));
    await rejected(c.requests.create({ ...base, answers: {} }));
    // A follow-up question only counts when its trigger answer was given.
    await rejected(c.requests.create({ ...base, answers: { problem: "fixture", flow: "large" } }));
  });

  it("only accepts offered time slots", async () => {
    await rejected((await callerFor(customer)).requests.create({ ...base, timeSlot: "3am" as never }));
  });
});

describe("specialist rules", () => {
  it("confirms urgency before quoting", async () => {
    const { id } = await (await callerFor(customer)).requests.create(base);
    await rejected((await callerFor(admin)).admin.sendQuote({ id, amount: "20" }));
  });

  it("requires a numeric quote amount", async () => {
    const { id } = await (await callerFor(customer)).requests.create(base);
    const s = await callerFor(admin);
    await s.admin.startReview({ id, urgency: "normal" });
    await rejected(s.admin.sendQuote({ id, amount: "call me" }));
    await s.admin.sendQuote({ id, amount: "45.50" });
  });

  it("assigns technicians only after the customer approves", async () => {
    const s = await callerFor(admin);
    const { id } = await (await callerFor(customer)).requests.create(base);
    await rejected(s.tech.assign({ requestId: id, technicianId: tech.id }));
    const approved = await approvedRequest();
    await s.tech.assign({ requestId: approved, technicianId: tech.id });
  });

  it("never assigns to a cancelled request", async () => {
    const c = await callerFor(customer);
    const { id } = await c.requests.create(base);
    await c.requests.cancel({ id });
    await rejected((await callerFor(admin)).tech.assign({ requestId: id, technicianId: tech.id }));
  });

  it("needs a technician before scheduling", async () => {
    const id = await approvedRequest();
    const s = await callerFor(admin);
    await expect(s.admin.setStatus({ id, status: "scheduled" })).rejects.toMatchObject({
      message: "Assign a technician before scheduling",
    });
    await s.tech.assign({ requestId: id, technicianId: tech.id });
    await s.admin.setStatus({ id, status: "scheduled" });
  });

  it("cannot demote a specialist by adding them as a technician", async () => {
    await rejected((await callerFor(admin)).tech.addByEmail({ email: ADMIN_EMAIL }));
  });
});

describe("customer rules", () => {
  it("can cancel until the visit is scheduled, not after", async () => {
    const s = await callerFor(admin);
    const c = await callerFor(customer);
    const id = await approvedRequest();
    await s.tech.assign({ requestId: id, technicianId: tech.id });
    await s.admin.setStatus({ id, status: "scheduled" });
    await rejected(c.requests.cancel({ id }));

    const early = await approvedRequest();
    await c.requests.cancel({ id: early });
  });
});

describe("technician accounts", () => {
  it("shows the customer's photos on the job card", async () => {
    const jobs = await (await callerFor(tech)).tech.myJobs();
    expect(jobs.length).toBeGreaterThan(0);
    expect(Array.isArray(jobs[0].media)).toBe(true);
  });

  it("can't be removed while they have an active job, then can", async () => {
    const s = await callerFor(admin);
    await rejected(s.tech.remove({ technicianId: tech.id }));
    // Finish every active job, then removal works.
    const t = await callerFor(tech);
    for (const job of await t.tech.myJobs()) {
      if (job.status === "scheduled") await t.tech.fieldEvent({ requestId: job.id, action: "start" });
      if (["scheduled", "in_progress"].includes(job.status)) {
        await t.tech.fieldEvent({ requestId: job.id, action: "complete" });
      }
    }
    await s.tech.remove({ technicianId: tech.id });
    expect((await s.tech.list()).map((x) => x.id)).not.toContain(tech.id);
  });
});
