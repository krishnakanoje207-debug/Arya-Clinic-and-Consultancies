/**
 * The doctor's morning/evening digest (src/lib/doctor-digest.js).
 *
 * Builds one fixture per rule — plus a near-miss that must NOT be listed —
 * on dates in 2032 with an injected "now", so real rows can't interfere.
 * Email and calendar are swapped for stubs: nothing reaches the real inbox or
 * the doctor's calendar. The calendar helper's own request (fixed id, popup,
 * 409 → PUT) is checked separately against a stubbed fetch.
 *
 *   node --env-file=.env scripts/e2e-doctor-digest.mjs
 */
import { register } from "node:module";
import { pathToFileURL } from "node:url";
import { randomUUID } from "node:crypto";
register("./scripts/alias-loader.mjs", pathToFileURL("./").href);

const { eq, inArray, like } = await import("drizzle-orm");
const { db } = await import("@/db");
const { appointments, contactMessages, medicationOrders, patients, services, testimonials } =
  await import("@/db/schema");
const { collectDoctorDigest, sendDoctorDigest } = await import("@/lib/doctor-digest");
const { upsertTodoEvent } = await import("@/lib/gcal");

let pass = true;
const log = (ok, m) => { if (!ok) pass = false; console.log(`${ok ? "✓" : "✗"} ${m}`); };

const TAG = "DDE2E";
const NOW = new Date("2032-06-15T04:30:00.000Z"); // Tue 10:00 IST
const H = 3600 * 1000, D = 24 * H;
const at = (ms) => new Date(NOW.getTime() + ms);

async function cleanup() {
  const ids = (await db.select({ id: patients.id }).from(patients).where(like(patients.name, `${TAG}%`))).map((p) => p.id);
  if (ids.length) {
    await db.delete(testimonials).where(inArray(testimonials.patientId, ids));
    await db.delete(medicationOrders).where(inArray(medicationOrders.patientId, ids));
    await db.delete(appointments).where(inArray(appointments.patientId, ids));
    await db.delete(patients).where(inArray(patients.id, ids));
  }
  await db.delete(contactMessages).where(like(contactMessages.name, `${TAG}%`));
}
await cleanup();

const [svc] = await db.select().from(services).where(eq(services.active, true)).limit(1);
let phoneN = 0;
const P = {};
for (const key of ["complete", "order", "ordered", "unpaid", "fresh", "ship", "refill", "renewed", "follow", "booked", "link", "today"]) {
  const name = `${TAG} ${key}`;
  [P[key]] = await db.insert(patients).values({
    name, nameKey: name.toLowerCase(), phone: `90002220${String(++phoneN).padStart(2, "0")}`,
  }).returning();
}
const appt = (p, status, startAt, extra = {}) => db.insert(appointments).values({
  patientName: p.name, patientPhone: p.phone, patientId: p.id, serviceId: svc.id, mode: "online",
  startAt, endAt: new Date(startAt.getTime() + svc.durationMinutes * 60000),
  status, amountInr: svc.feeInr, manageToken: randomUUID(), ...extra,
}).returning().then((r) => r[0]);
const order = (p, extra) => db.insert(medicationOrders).values({
  patientId: p.id, title: `${TAG} remedy`, options: [{ days: 30, amountInr: 600 }],
  chosenDurationDays: 30, amountInr: 600, ...extra,
}).returning().then((r) => r[0]);

// Fixtures, one per rule (+ near-misses).
await appt(P.complete, "confirmed", at(-D + 30 * 60000));               // over, not marked completed
await appt(P.order, "completed", at(-2 * D));                           // completed, no medicine order
await appt(P.ordered, "completed", at(-2 * D + H));                     // completed…
await order(P.ordered, { status: "pending_payment", createdAt: at(-2 * D + 2 * H) }); // …and ordered since
await order(P.unpaid, { status: "pending_payment", createdAt: at(-3 * D) });           // unpaid 3 days
await order(P.fresh, { status: "pending_payment", createdAt: at(-H) });                // unpaid 1 hour: too soon
await order(P.ship, { status: "paid", paidAt: at(-2 * D), createdAt: at(-3 * D) });    // paid, not shipped
await order(P.refill, { status: "shipped", paidAt: at(-28 * D), shippedAt: at(-27 * D), createdAt: at(-29 * D) }); // runs out in 3 days
await order(P.renewed, { status: "shipped", paidAt: at(-28 * D), shippedAt: at(-27 * D), createdAt: at(-29 * D) }); // runs out…
await order(P.renewed, { status: "pending_payment", createdAt: at(-D) });                                         // …but renewed
await appt(P.follow, "completed", at(-30 * D));                         // last visit 30 days ago
await appt(P.booked, "completed", at(-30 * D + H));                     // 30 days ago…
await appt(P.booked, "confirmed", at(5 * D));                           // …but already rebooked
await appt(P.link, "confirmed", at(20 * H));                            // tomorrow, online, no link
await appt(P.today, "confirmed", at(3 * H), { meetingLink: "https://meet.google.com/aaa-bbbb-ccc" }); // today, has link
await db.insert(testimonials).values({ patientId: P.follow.id, patientName: `${TAG} reviewer`, text: "Great", rating: 5, consentConfirmed: true, published: false });
const [msg] = await db.insert(contactMessages).values({ name: `${TAG} visitor`, phone: "9000222099", message: "Do you treat migraine?" }).returning();

const names = (list, pick) => list.map(pick);
const has = (list, pick, p) => names(list, pick).includes(p.name);

try {
  const d = await collectDoctorDigest({ slot: "morning", now: NOW });
  const t = d.todos;
  const apptName = (a) => a.patientName;
  const orderName = (o) => o.name;

  log(has(t.toComplete, apptName, P.complete), `mark completed: yesterday's unclosed consult is listed`);
  log(has(t.needOrder, apptName, P.order) && !has(t.needOrder, apptName, P.ordered),
    `medicine order: completed consult without an order listed; one with an order since is not`);
  log(has(t.unpaid, orderName, P.unpaid) && !has(t.unpaid, orderName, P.fresh),
    `ask for payment: unpaid 3 days listed; unpaid 1 hour is not`);
  log(has(t.toShip, orderName, P.ship), `ship: paid-but-unshipped order listed`);
  log(has(t.refill, orderName, P.refill) && !has(t.refill, orderName, P.renewed),
    `refill: supply ending in 3 days listed; one already renewed is not`);
  log(t.followUp.some((f) => f.patient.id === P.follow.id) && !t.followUp.some((f) => f.patient.id === P.booked.id),
    `follow-up: 30 days since last visit listed; one already rebooked is not`);
  log(has(t.noLink, apptName, P.link) && !has(t.noLink, apptName, P.today),
    `video link: tomorrow's online consult without a link listed; one with a link is not`);
  log(t.reviews.some((r) => r.patientName === `${TAG} reviewer`), `reviews: unpublished patient review listed`);
  log(d.messages.some((m) => m.id === msg.id), `messages: unread contact-form message listed`);
  log(d.schedule.some(({ appt: a }) => a.patientId === P.today.id) && !d.schedule.some(({ appt: a }) => a.patientId === P.link.id),
    `morning schedule is today's consults only`);

  const ev = await collectDoctorDigest({ slot: "evening", now: NOW });
  log(ev.schedule.some(({ appt: a }) => a.patientId === P.link.id) && !ev.schedule.some(({ appt: a }) => a.patientId === P.today.id),
    `evening schedule is tomorrow's consults only`);

  // Delivery, with stubs.
  const sent = [], events = [];
  process.env.GMAIL_USER ||= "doctor@example.test";
  const res = await sendDoctorDigest({
    slot: "morning",
    now: NOW,
    deps: {
      sendEmail: async (m) => { sent.push(m); return { sent: true }; },
      upsertTodoEvent: async (e) => { events.push(e); return { ok: true }; },
    },
  });
  const mail = sent[0];
  log(res.sent && mail?.to === process.env.GMAIL_USER, `email goes to the clinic inbox`);
  log(/ARYA morning to-dos · 15 Jun — \d+ to do/.test(mail?.subject || ""), `subject: "${mail?.subject}"`);
  for (const [label, needle] of [
    ["today's schedule", "TODAY'S CONSULTATIONS"],
    ["mark completed", `Mark the consultation completed`],
    ["medicine order", `Create the medicine order`],
    ["ask for payment", `Ask for the medicine payment`],
    ["ship", `Schedule delivery for paid medicines`],
    ["refill", `Prepare the next medicine order`],
    ["follow-up", `Follow-up due`],
    ["video link", `Add a video link`],
    ["reviews", `Patient reviews waiting`],
    ["messages", `Do you treat migraine?`],
  ]) log(mail?.text.includes(needle), `email includes ${label}`);
  log(/→ https?:\/\/[^\s]+\/admin\/medications/.test(mail?.text || "") || !process.env.NEXT_PUBLIC_SITE_URL,
    `email links straight to the admin page to act on`);

  const e = events[0];
  log(/^todo20320615am[0-9a-v]{5}$/.test(e?.id || ""), `calendar entry has a fixed per-day id (${e?.id})`);
  log(e && e.start.getTime() === NOW.getTime() + 5 * 60000, `calendar entry is timed 5 minutes after the run`);
  log(e?.summary?.startsWith("ARYA to-dos ("), `calendar entry title: "${e?.summary}"`);

  const [after] = await db.select().from(contactMessages).where(eq(contactMessages.id, msg.id));
  log(after.read === true, `contact message marked read once the email went out`);

  // A failed email must not mark messages read.
  const [msg2] = await db.insert(contactMessages).values({ name: `${TAG} visitor 2`, message: "Second message" }).returning();
  await sendDoctorDigest({
    slot: "evening", now: NOW,
    deps: { sendEmail: async () => { throw new Error("smtp down"); }, upsertTodoEvent: async () => ({ ok: true }) },
  });
  const [after2] = await db.select().from(contactMessages).where(eq(contactMessages.id, msg2.id));
  log(after2.read === false, `a failed email leaves the message unread for the next digest`);

  // The calendar helper's own request, against a stubbed fetch (no network).
  const realFetch = globalThis.fetch;
  const calls = [];
  globalThis.fetch = async (url, init = {}) => {
    // The token request is form-encoded; only the Calendar calls carry JSON.
    const body = typeof init.body === "string" && init.body.startsWith("{") ? JSON.parse(init.body) : null;
    calls.push({ url: String(url), method: init.method || "GET", body });
    if (String(url).includes("oauth2.googleapis.com")) return Response.json({ access_token: "stub", expires_in: 3600 });
    if ((init.method || "GET") === "POST") return new Response("dup", { status: 409 });
    return Response.json({ id: "x" });
  };
  const prevCal = process.env.GOOGLE_CALENDAR_ID;
  process.env.GOOGLE_CALENDAR_ID ||= "stub@example.test";
  try {
    const r = await upsertTodoEvent({ id: "todotest1", summary: "S", description: "D", start: NOW });
    const post = calls.find((c) => c.method === "POST" && c.url.includes("/events"));
    const put = calls.find((c) => c.method === "PUT");
    log(r.ok && post && put && put.url.endsWith("/events/todotest1"), `calendar: an existing id (409) is replaced with PUT, not duplicated`);
    log(post?.body?.reminders?.overrides?.[0]?.method === "popup" && post.body.transparency === "transparent",
      `calendar: phone popup at start, and the entry doesn't block her time`);
    log(put?.body?.status === "confirmed", `calendar: a deleted entry is revived on re-run`);
  } finally {
    globalThis.fetch = realFetch;
    if (prevCal === undefined) delete process.env.GOOGLE_CALENDAR_ID; else process.env.GOOGLE_CALENDAR_ID = prevCal;
  }
} finally {
  await cleanup();
  console.log("\ncleanup: digest fixtures removed");
}

process.exitCode = pass ? 0 : 1;
