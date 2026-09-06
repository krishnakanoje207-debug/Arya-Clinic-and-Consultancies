/**
 * Google Meet auto-link E2E. Drives the REAL createAppointmentEvent against the
 * live local database with global fetch stubbed, so the OAuth path can be
 * exercised without real Google credentials (which only the doctor can grant).
 *
 * Covers: service-account path unchanged when OAuth is unconfigured or not yet
 * consented → conferenceDataVersion=1 + hangoutsMeet createRequest on the OAuth
 * path → hangoutLink stored in appointments.meeting_link → the default_meet_link
 * fallback is replaced but a hand-typed link is not → a revoked grant falls back
 * to the service account instead of failing.
 *
 *   node --env-file=.env scripts/e2e-google-meet.mjs
 *
 * Imports app modules through the "@/" alias via scripts/alias-loader.mjs
 * (same pattern as e2e-admin-ops.mjs).
 */
import { register } from "node:module";
import { randomUUID, generateKeyPairSync } from "node:crypto";
import { pathToFileURL } from "node:url";

register("./scripts/alias-loader.mjs", pathToFileURL("./").href);

const { eq } = await import("drizzle-orm");
const { db } = await import("@/db");
const { appointments, services, settings } = await import("@/db/schema");
const { getSettings, setSetting } = await import("@/lib/settings");
const ORIGINAL_DEFAULT_LINK = (await getSettings(["default_meet_link"]))
  .default_meet_link;

let pass = 0;
let fail = 0;
function log(ok, msg) {
  console.log(`${ok ? "✓" : "✗"} ${msg}`);
  ok ? pass++ : fail++;
  if (!ok) process.exitCode = 1;
}

// --- Fake credentials -------------------------------------------------------
const { privateKey } = generateKeyPairSync("rsa", {
  modulusLength: 2048,
  privateKeyEncoding: { type: "pkcs8", format: "pem" },
  publicKeyEncoding: { type: "spki", format: "pem" },
});
process.env.GOOGLE_SERVICE_ACCOUNT_JSON = JSON.stringify({
  client_email: "fake-bot@example.iam.gserviceaccount.com",
  private_key: privateKey,
});
process.env.GOOGLE_CALENDAR_ID = "fake@group.calendar.google.com";

// --- fetch stub -------------------------------------------------------------
const calls = [];
const realFetch = globalThis.fetch;
globalThis.fetch = async (url, init = {}) => {
  const href = String(url);
  calls.push({ href, init });
  if (href.startsWith("https://oauth2.googleapis.com/token")) {
    const body = String(init.body);
    const grant = new URLSearchParams(body).get("grant_type");
    const token = grant === "refresh_token" ? "OAUTH-TOKEN" : "SA-TOKEN";
    return new Response(JSON.stringify({ access_token: token }), {
      status: 200,
      headers: { "content-type": "application/json" },
    });
  }
  if (href.includes("/calendar/v3/")) {
    const wantsConference = href.includes("conferenceDataVersion=1");
    return new Response(
      JSON.stringify({
        id: "evt-123",
        ...(wantsConference
          ? { hangoutLink: "https://meet.google.com/abc-defg-hij" }
          : {}),
      }),
      { status: 200, headers: { "content-type": "application/json" } },
    );
  }
  return realFetch(url, init);
};

const { createAppointmentEvent } = await import("@/lib/gcal");
const { oauthConfigured, oauthConnected, REFRESH_TOKEN_KEY } = await import(
  "@/lib/google-oauth"
);

// --- Fixtures ---------------------------------------------------------------
const [svc] = await db.select().from(services);
const NOTE = `oauth-meet-check ${randomUUID()}`;
let apptId = null;

function calendarCall() {
  return calls.filter((c) => c.href.includes("/calendar/v3/")).at(-1);
}

async function freshAppt(meetingLink = null) {
  const start = new Date(Date.now() + 400 * 24 * 3600 * 1000);
  const [row] = await db
    .insert(appointments)
    .values({
      patientName: "OAuth Check",
      patientPhone: "9999000004",
      problemNote: NOTE,
      serviceId: svc.id,
      mode: "online",
      startAt: start,
      endAt: new Date(start.getTime() + 30 * 60000),
      status: "confirmed",
      amountInr: 100,
      meetingLink,
      manageToken: randomUUID(),
    })
    .returning();
  apptId = row.id;
  return row;
}

async function cleanupAppt() {
  if (apptId) await db.delete(appointments).where(eq(appointments.id, apptId));
  apptId = null;
}

try {
  // === 1. No OAuth configured → today's behaviour exactly ===================
  delete process.env.GOOGLE_OAUTH_CLIENT_ID;
  delete process.env.GOOGLE_OAUTH_CLIENT_SECRET;
  log(oauthConfigured() === false, "oauthConfigured() false without env vars");
  log((await oauthConnected()) === false, "oauthConnected() false without env vars");

  let appt = await freshAppt();
  let res = await createAppointmentEvent(appt);
  let call = calendarCall();
  log(res.ok && res.id === "evt-123", "SA path: event created");
  log(res.meetingLink === undefined, "SA path: no meeting link returned");
  log(!call.href.includes("conferenceDataVersion"), "SA path: no conferenceDataVersion param");
  log(!JSON.parse(call.init.body).conferenceData, "SA path: no conferenceData in body");
  log(call.init.headers.authorization === "Bearer SA-TOKEN", "SA path: service-account token used");
  let [row] = await db.select().from(appointments).where(eq(appointments.id, apptId));
  log(row.googleEventId === "evt-123", "SA path: google_event_id stored");
  log(row.meetingLink === null, "SA path: meeting_link untouched");
  await cleanupAppt();

  // === 2. Env set but not consented → still the SA path =====================
  process.env.GOOGLE_OAUTH_CLIENT_ID = "fake-client-id";
  process.env.GOOGLE_OAUTH_CLIENT_SECRET = "fake-client-secret";
  await setSetting(REFRESH_TOKEN_KEY, "");
  log(oauthConfigured() === true, "oauthConfigured() true with env vars");
  log((await oauthConnected()) === false, "oauthConnected() false with empty stored token");

  appt = await freshAppt();
  await createAppointmentEvent(appt);
  call = calendarCall();
  log(!call.href.includes("conferenceDataVersion"), "unconsented: no conferenceDataVersion param");
  log(call.init.headers.authorization === "Bearer SA-TOKEN", "unconsented: service-account token used");
  await cleanupAppt();

  // === 3. Connected → OAuth path + Meet conference ==========================
  await setSetting(REFRESH_TOKEN_KEY, "fake-refresh-token");
  log((await oauthConnected()) === true, "oauthConnected() true once a token is stored");

  appt = await freshAppt();
  res = await createAppointmentEvent(appt);
  call = calendarCall();
  const body = JSON.parse(call.init.body);
  log(call.href.includes("conferenceDataVersion=1"), "OAuth path: conferenceDataVersion=1 present");
  log(call.init.headers.authorization === "Bearer OAUTH-TOKEN", "OAuth path: user token used");
  log(
    body.conferenceData?.createRequest?.conferenceSolutionKey?.type === "hangoutsMeet",
    "OAuth path: hangoutsMeet createRequest sent",
  );
  log(
    typeof body.conferenceData?.createRequest?.requestId === "string",
    "OAuth path: requestId present",
  );
  log(res.meetingLink === "https://meet.google.com/abc-defg-hij", "OAuth path: hangoutLink returned to caller");
  [row] = await db.select().from(appointments).where(eq(appointments.id, apptId));
  log(row.meetingLink === "https://meet.google.com/abc-defg-hij", "OAuth path: meeting_link stored");
  await cleanupAppt();

  // === 4. Meet link replaces the default_meet_link fallback =================
  await setSetting("default_meet_link", "https://meet.google.com/default-room");
  appt = await freshAppt("https://meet.google.com/default-room");
  await createAppointmentEvent(appt);
  [row] = await db.select().from(appointments).where(eq(appointments.id, apptId));
  log(row.meetingLink === "https://meet.google.com/abc-defg-hij", "default fallback link is replaced by the per-appointment Meet link");
  await cleanupAppt();

  // === 5. A hand-typed link is NOT replaced ================================
  appt = await freshAppt("https://zoom.us/j/hand-typed");
  await createAppointmentEvent(appt);
  [row] = await db.select().from(appointments).where(eq(appointments.id, apptId));
  log(row.meetingLink === "https://zoom.us/j/hand-typed", "hand-typed link is preserved");
  log(row.googleEventId === "evt-123", "hand-typed link case still stores the event id");
  await cleanupAppt();

  // === 6. Revoked grant (refresh fails) → silent fallback to the SA path ====
  const failingFetch = globalThis.fetch;
  globalThis.fetch = async (url, init = {}) => {
    if (
      String(url).startsWith("https://oauth2.googleapis.com/token") &&
      new URLSearchParams(String(init.body)).get("grant_type") === "refresh_token"
    ) {
      calls.push({ href: String(url), init });
      return new Response("invalid_grant", { status: 400 });
    }
    return failingFetch(url, init);
  };
  appt = await freshAppt();
  res = await createAppointmentEvent(appt);
  call = calendarCall();
  log(res.ok === true, "revoked grant: create still succeeds");
  log(call.init.headers.authorization === "Bearer SA-TOKEN", "revoked grant: falls back to the service account");
  log(!call.href.includes("conferenceDataVersion"), "revoked grant: no conference requested");
  globalThis.fetch = failingFetch;
  await cleanupAppt();
} finally {
  await cleanupAppt();
  await db.delete(settings).where(eq(settings.key, REFRESH_TOKEN_KEY));
  await setSetting("default_meet_link", ORIGINAL_DEFAULT_LINK);
  console.log(`\n${pass} passed, ${fail} failed`);
}
