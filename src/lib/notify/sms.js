/**
 * SMS via the doctor's own Android phone running textbee.dev
 * (open-source android-sms-gateway). ₹0 — messages ride the SIM's SMS
 * pack. The phone must stay on/charged/on-network; email is the
 * independent fallback channel.
 */
const TEXTBEE_BASE = "https://api.textbee.dev/api/v1";

export function smsConfigured() {
  return Boolean(process.env.TEXTBEE_API_KEY && process.env.TEXTBEE_DEVICE_ID);
}

/** Normalize to +91XXXXXXXXXX for bare 10-digit Indian numbers. */
function normalizePhone(phone) {
  const digits = String(phone).replace(/[^\d+]/g, "");
  if (/^\d{10}$/.test(digits)) return `+91${digits}`;
  // Trunk-prefixed domestic form, e.g. 09876543210.
  if (/^0\d{10}$/.test(digits)) return `+91${digits.slice(1)}`;
  if (digits.startsWith("+")) return digits;
  return `+${digits}`;
}

/** Send one SMS. Throws on HTTP errors — dispatcher catches per channel. */
export async function sendSms({ to, message }) {
  if (!smsConfigured()) return { skipped: true, reason: "sms_not_configured" };
  const deviceId = process.env.TEXTBEE_DEVICE_ID;
  const res = await fetch(
    `${TEXTBEE_BASE}/gateway/devices/${deviceId}/send-sms`,
    {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": process.env.TEXTBEE_API_KEY,
      },
      body: JSON.stringify({
        recipients: [normalizePhone(to)],
        message,
      }),
    },
  );
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`textbee ${res.status}: ${body.slice(0, 200)}`);
  }
  return { sent: true };
}
