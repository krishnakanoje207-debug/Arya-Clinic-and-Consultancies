# Google Meet links — one time, ~15 minutes

Today a confirmed online consultation gets whatever video link you paste in by
hand (or the one reusable room set in **Admin ▸ Settings ▸ Default video
meeting link**). After this setup, **every confirmed online consultation gets
its own Google Meet room automatically**, created on your calendar and included
in the confirmation email/SMS the patient receives.

**Why an extra setup at all?** The site already logs in to Google as a *service
account* (see `GOOGLE-SETUP.md`). Google does not let a service account create
Meet rooms — it silently ignores the request. Only a real person's account can.
So you sign in once with your own Google account and grant permission; the site
stores that permission and creates the meetings as you from then on.

**Prerequisite:** `GOOGLE-SETUP.md` Step 6b (Calendar sync) must already be
working. Meet links are attached to the calendar event, so if calendar sync is
off, this does nothing.

**This is optional and best-effort.** Skip it and the site keeps working exactly
as it does now.

---

## Step 1 — Configure the OAuth consent screen

1. Go to <https://console.cloud.google.com/> and select the **same project** you
   made in `GOOGLE-SETUP.md` (e.g. `drseema-site`).
2. Left menu ▸ **APIs & Services ▸ OAuth consent screen**.
3. User type: **External**. Click **Create**.
4. Fill in the required fields:
   - **App name** — e.g. `ARYA Homoeopathy site`
   - **User support email** — the clinic Google account
   - **Developer contact email** — the same address
   Leave everything else at its default. **Save and continue** through the
   Scopes and Test users steps (nothing to add), then **Back to dashboard**.

### ⚠️ The one thing you must not skip

On the OAuth consent screen page there is a **Publishing status**. While it says
**“Testing”, Google expires the stored permission after 7 days** — Meet links
would silently stop generating a week later and you would be back to pasting
links by hand.

**Click “Publish app” so the publishing status reads “In production”.** Confirm
the dialog. That is all — because the app only ever asks for calendar access for
your own single account, Google does **not** require a verification review.

The visible consequence: during the one-time sign-in in Step 5 Google shows a
**“Google hasn’t verified this app”** warning. That is expected and safe here —
the “app” is your own website asking for your own calendar. Click **Advanced ▸
Go to … (unsafe)** and continue.

## Step 2 — Create the OAuth client

1. Left menu ▸ **APIs & Services ▸ Credentials**.
2. **+ Create credentials ▸ OAuth client ID**.
3. **Application type: Web application** (not "Desktop", not "TVs" — Web
   application is the only type that works here).
4. Name it e.g. `drseema-site web`.
5. Under **Authorised redirect URIs**, click **+ Add URI** and add **both** of
   these, exactly, including the scheme and with no trailing slash:

   ```
   http://localhost:3000/admin/google/callback
   https://YOUR-PRODUCTION-DOMAIN/admin/google/callback
   ```

   The production one is your `NEXT_PUBLIC_SITE_URL` with
   `/admin/google/callback` appended. If the site also runs on a Vercel preview
   domain you want to connect from, add that one too.
6. **Create**. A dialog shows the **Client ID** and **Client secret** — copy
   both now (the secret can be re-downloaded later from the same page).

> The permission (scope) the site asks for is
> `https://www.googleapis.com/auth/calendar.events` — create and update events
> on your calendars, nothing else. No Gmail, no Drive, no contacts.

## Step 3 — Set the environment variables

Names must match exactly:

- `GOOGLE_OAUTH_CLIENT_ID` — the Client ID from Step 2
- `GOOGLE_OAUTH_CLIENT_SECRET` — the Client secret from Step 2

Also make sure `NEXT_PUBLIC_SITE_URL` is set to the site's real origin (e.g.
`https://www.example.com`) — the redirect URI is built from it, and a mismatch
with Step 2 is the single most common cause of a failed connect.

**Locally:** add them to `.env`, then restart `npm run dev`.

**On Vercel:** Project ▸ Settings ▸ Environment Variables ▸ add both for
**Production** (and Preview, if you added a preview redirect URI), then
**redeploy** — env vars only take effect on a new deployment.

There is **no** environment variable for the token itself. It is created in the
next step and stored in the site's database.

## Step 4 — Redeploy / restart

Nothing appears in the admin panel until the two variables are live.

## Step 5 — Connect the account (in the admin panel)

1. Sign in to the site's admin panel and open **Settings**.
2. At the top you'll see **Google Meet links (automatic)** with the status
   **Not connected**. Click **Connect Google account**.
3. Google asks you to sign in — **use the clinic Google account that owns the
   calendar** from `GOOGLE-SETUP.md`.
4. You'll see the “Google hasn’t verified this app” screen described in Step 1:
   **Advanced ▸ Go to … (unsafe)**.
5. Approve the calendar permission. You land back on **Settings** with the
   status **Connected**.

That's it. Confirm a test online appointment: the calendar event should now
carry a **Join with Google Meet** button, and the same link should appear on the
appointment in the admin panel and in the patient's confirmation message.

## Turning it off

Admin ▸ Settings ▸ **Disconnect**. New appointments fall back to the default
video meeting link (or none). To also revoke the permission on Google's side,
go to <https://myaccount.google.com/permissions> and remove the app.

---

## If something goes wrong

| What you see | Cause / fix |
| --- | --- |
| `redirect_uri_mismatch` on Google's page | The URI in Step 2 doesn't match `NEXT_PUBLIC_SITE_URL` + `/admin/google/callback` character for character (http vs https, `www` vs no `www`, trailing slash). |
| Settings says *"Set GOOGLE_OAUTH_CLIENT_ID and …"* | The env vars aren't live — set them and redeploy/restart. |
| *"Security check failed (the connect link expired)"* | You took longer than 10 minutes, or opened the connect link in a different browser. Just click **Connect** again. |
| *"Google did not return a refresh token"* | Rare; usually a half-finished earlier grant. Remove the app at <https://myaccount.google.com/permissions>, then connect again. |
| It worked, then stopped after a week | The OAuth consent screen slipped back to **Testing**. Set publishing status to **In production** (Step 1) and reconnect. |
| Events appear but with no Meet button | Calendar sync is running on the service account only — check the status line in Admin ▸ Settings, and that you connected the account that owns `GOOGLE_CALENDAR_ID`. |

> Security: the client secret is a password — keep it in env vars only, never in
> git. The stored permission lives in the site's `settings` table and is never
> shown in the admin UI. If either leaks, delete the OAuth client in
> **Credentials** and redo Steps 2–5.
