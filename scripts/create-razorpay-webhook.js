/**
 * ── Register the Razorpay webhook (run this ONCE, on KYC / go-live day) ──────
 *
 * WHAT THIS DOES
 *   Tells Razorpay to POST payment events to this site's webhook endpoint
 *   (<site>/api/razorpay/webhook). That endpoint is what actually confirms a
 *   booking / medication order after the patient pays, so payments won't
 *   auto-confirm until this webhook exists.
 *
 * BEFORE YOU RUN IT
 *   1. Put the LIVE keys in .env (once the account is KYC-approved):
 *        RAZORPAY_KEY_ID=rzp_live_xxxxxxxx
 *        RAZORPAY_KEY_SECRET=xxxxxxxx
 *        RAZORPAY_WEBHOOK_SECRET=<a long random string YOU choose>
 *        NEXT_PUBLIC_SITE_URL=https://the-real-domain.com
 *      RAZORPAY_WEBHOOK_SECRET can be any random string — it just has to be the
 *      SAME value here and in the app's env, so the app can verify Razorpay's
 *      signature. (You can test first with the rzp_test_ keys against a public
 *      preview URL.)
 *
 * HOW TO RUN IT (from the project folder)
 *        node --env-file=.env scripts/create-razorpay-webhook.js
 *
 * IT IS SAFE TO RUN AGAIN
 *   It first lists existing webhooks and does nothing if one is already
 *   registered for this URL. You'll see ✅ (created), ⚠️ (already there /
 *   skipped) or ❌ (something's wrong — read the message).
 * ────────────────────────────────────────────────────────────────────────────
 */
import fs from "node:fs";

const API = "https://api.razorpay.com/v1";
const EVENTS = ["payment.captured", "payment.failed"];

// Allow running without --env-file by parsing .env from the project root.
function loadEnvFallback() {
  if (process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET) return;
  try {
    const text = fs.readFileSync(new URL("../.env", import.meta.url), "utf8");
    for (const line of text.split(/\r?\n/)) {
      const m = /^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/.exec(line);
      if (!m) continue;
      const key = m[1];
      let val = m[2];
      if (/^".*"$/.test(val) || /^'.*'$/.test(val)) val = val.slice(1, -1);
      if (!(key in process.env)) process.env[key] = val;
    }
  } catch {
    /* no .env file — rely on the real environment */
  }
}

function authHeader() {
  const token = Buffer.from(
    `${process.env.RAZORPAY_KEY_ID}:${process.env.RAZORPAY_KEY_SECRET}`,
  ).toString("base64");
  return `Basic ${token}`;
}

async function main() {
  loadEnvFallback();

  const keyId = process.env.RAZORPAY_KEY_ID;
  const keySecret = process.env.RAZORPAY_KEY_SECRET;
  const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;
  const site = (process.env.NEXT_PUBLIC_SITE_URL || "").replace(/\/+$/, "");

  if (!keyId || !keySecret) {
    console.error("❌ RAZORPAY_KEY_ID / RAZORPAY_KEY_SECRET missing from .env.");
    process.exit(1);
  }
  if (!webhookSecret) {
    console.error("❌ RAZORPAY_WEBHOOK_SECRET missing — set a random string in .env first.");
    process.exit(1);
  }
  if (!site || !/^https?:\/\//.test(site)) {
    console.error("❌ NEXT_PUBLIC_SITE_URL missing or not a full https URL in .env.");
    process.exit(1);
  }
  const url = `${site}/api/razorpay/webhook`;

  // 1. Idempotency: is a webhook already registered for this exact URL?
  const listRes = await fetch(`${API}/webhooks?count=100`, {
    headers: { authorization: authHeader() },
  });
  if (!listRes.ok) {
    console.error(`❌ Could not list existing webhooks: ${listRes.status} ${await listRes.text()}`);
    process.exit(1);
  }
  const list = await listRes.json();
  const items = Array.isArray(list?.items) ? list.items : [];
  if (items.some((w) => w.url === url)) {
    console.log(`⚠️  A webhook for ${url} already exists — nothing to do.`);
    process.exit(0);
  }

  // 2. Create it.
  const createRes = await fetch(`${API}/webhooks`, {
    method: "POST",
    headers: { authorization: authHeader(), "content-type": "application/json" },
    // Razorpay expects events as {name: true}, not an array (array indices
    // get read as event names → "Invalid event name: 1").
    body: JSON.stringify({
      url,
      secret: webhookSecret,
      events: Object.fromEntries(EVENTS.map((e) => [e, true])),
    }),
  });
  if (!createRes.ok) {
    console.error(`❌ Webhook create failed: ${createRes.status} ${await createRes.text()}`);
    process.exit(1);
  }
  const created = await createRes.json();
  console.log(`✅ Webhook created for ${url}`);
  console.log(`   id: ${created.id}   events: ${EVENTS.join(", ")}`);
  console.log("   Make sure RAZORPAY_WEBHOOK_SECRET in the app's env matches the value used here.");
}

main().catch((err) => {
  console.error("❌ Unexpected error:", err?.message || err);
  process.exit(1);
});
