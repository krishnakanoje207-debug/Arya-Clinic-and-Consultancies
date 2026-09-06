import { getSettings } from "@/lib/settings";
import { calendarConfigured } from "@/lib/gcal";
import { oauthConfigured, oauthConnected } from "@/lib/google-oauth";
import { disconnectGoogleAccount } from "@/app/admin/actions/settings";
import SettingsForm from "@/components/admin/SettingsForm";

export const dynamic = "force-dynamic";

/** Outcome of the one-time consent round-trip (see
 * src/app/admin/google/callback/route.js). */
const GOOGLE_MESSAGES = {
  connected: "Google account connected.",
  denied: "Consent was cancelled — nothing changed.",
  state: "Security check failed (the connect link expired). Try again.",
  failed:
    "Google did not return a refresh token. Try again; if it repeats see GOOGLE-OAUTH-SETUP.md.",
  not_configured:
    "Set GOOGLE_OAUTH_CLIENT_ID and GOOGLE_OAUTH_CLIENT_SECRET first — see GOOGLE-OAUTH-SETUP.md.",
};

export default async function AdminSettings({ searchParams }) {
  const settings = await getSettings();
  const { google } = await searchParams;
  const configured = oauthConfigured();
  const connected = await oauthConnected();
  const message = GOOGLE_MESSAGES[google];

  return (
    <div className="space-y-6">
      <h1 className="font-display text-2xl text-sage-deep font-semibold">
        Settings
      </h1>

      <div className="card-warm p-6 space-y-4 max-w-2xl">
        <h2 className="font-semibold text-ink">
          Google Meet links (automatic)
        </h2>
        <p className="text-sm text-ink-soft">
          Connect your own Google account once and every confirmed online
          consultation gets its own Google Meet room, created on your calendar
          and sent to the patient. Until then the default video meeting link
          below is used.
        </p>
        {!configured && (
          <p className="text-sm text-terracotta-deep">
            Not set up yet: the site needs <code>GOOGLE_OAUTH_CLIENT_ID</code>{" "}
            and <code>GOOGLE_OAUTH_CLIENT_SECRET</code>. See{" "}
            <code>GOOGLE-OAUTH-SETUP.md</code>.
          </p>
        )}
        {configured && !calendarConfigured() && (
          <p className="text-sm text-terracotta-deep">
            Calendar sync is off (<code>GOOGLE_SERVICE_ACCOUNT_JSON</code> /{" "}
            <code>GOOGLE_CALENDAR_ID</code>). Meet links need it — see{" "}
            <code>GOOGLE-SETUP.md</code>.
          </p>
        )}
        <div className="flex flex-wrap items-center gap-3">
          <span className="text-sm">
            Status:{" "}
            <strong className={connected ? "text-sage-deep" : "text-ink-soft"}>
              {connected ? "Connected" : "Not connected"}
            </strong>
          </span>
          {connected ? (
            <form action={disconnectGoogleAccount}>
              <button type="submit" className="btn-ghost text-sm">
                Disconnect
              </button>
            </form>
          ) : (
            <a href="/admin/google/connect" className="btn-ghost text-sm">
              Connect Google account
            </a>
          )}
        </div>
        {message && <p className="text-sm text-ink-soft">{message}</p>}
      </div>

      <SettingsForm settings={settings} />
    </div>
  );
}
