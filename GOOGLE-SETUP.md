# Google setup (Sheet + Calendar + Drive) — one time, ~20 minutes

The site can, optionally, do three Google things:

1. **Google Sheet ("Excel")** — every time you mark a consultation *completed*,
   one row with the full case picture is appended to a spreadsheet in your Drive.
2. **Google Calendar** — a confirmed appointment becomes an event on your
   calendar; rescheduling moves it; cancelling deletes it.
3. **Drive archival** — the yearly appointments archive is also copied to a
   Drive folder (older feature; optional).

**All three are best-effort.** If you skip this whole page the site works
perfectly — those features just stay off. You can turn them on any time by
setting the environment variables below.

All three share **one** service account (a robot Google account the site logs in
as). You create it once, then share your Sheet / Calendar / Drive folder *with
its email address*.

---

## Step 1 — Create a Google Cloud project

1. Go to <https://console.cloud.google.com/> and sign in with the clinic Google
   account.
2. Top bar ▸ project dropdown ▸ **New Project**. Name it e.g. `drseema-site`.
   Create, then make sure it's the selected project.

## Step 2 — Enable the APIs

In the search bar type each of these, open it, and click **Enable**:

- **Google Sheets API**
- **Google Drive API**
- **Google Calendar API**

## Step 3 — Create the service account

1. Left menu ▸ **APIs & Services ▸ Credentials**.
2. **+ Create credentials ▸ Service account**.
3. Name it e.g. `drseema-site-bot`. Click **Create and continue**, then **Done**
   (you can skip the optional role/permission steps).
4. You now see the service account in the list. **Copy its email** — it looks
   like `drseema-site-bot@drseema-site.iam.gserviceaccount.com`. You'll share
   things with this address in Step 6.

## Step 4 — Download the JSON key

1. Click the service account ▸ **Keys** tab ▸ **Add key ▸ Create new key**.
2. Choose **JSON** ▸ **Create**. A `.json` file downloads. Keep it secret.

## Step 5 — Set the environment variables

Set these where the site's env vars live (Vercel ▸ Project ▸ Settings ▸
Environment Variables, or your local `.env`). Names must match exactly:

- `GOOGLE_SERVICE_ACCOUNT_JSON` — the **entire** contents of the JSON file from
  Step 4, on **one line**. (Open the file, copy everything, paste as the value.
  Vercel accepts newlines, but one line is safest.)
- `GOOGLE_SHEET_ID` — filled in Step 6a.
- `GOOGLE_CALENDAR_ID` — filled in Step 6b.
- `DRIVE_ARCHIVE_FOLDER_ID` — only if you also want Drive archival (optional).

## Step 6 — Share your Sheet / Calendar / Drive with the robot

The service account can only touch things you explicitly share with its email
(from Step 3).

### 6a. The Google Sheet

1. In Google Drive create a new **Google Sheets** spreadsheet, e.g.
   "Completed consultations". Leave it empty — the site writes the header row
   automatically on the first completed appointment.
2. Click **Share**, paste the service-account email, set it to **Editor**, send.
3. Copy the **spreadsheet id** from its URL — the long code between `/d/` and
   `/edit`:
   `https://docs.google.com/spreadsheets/d/`**`THIS_IS_THE_ID`**`/edit`
   Set that as `GOOGLE_SHEET_ID`.

### 6b. The Google Calendar

1. Open **Google Calendar**. Decide which calendar to use — your main one, or a
   new dedicated one (**+ Other calendars ▸ Create new calendar**).
2. Hover the calendar in the left list ▸ **⋮ ▸ Settings and sharing**.
3. Under **Share with specific people**, add the service-account email and set
   permission to **Make changes to events**.
4. Scroll to **Integrate calendar** ▸ copy the **Calendar ID**. For your primary
   calendar this is just your email address; for a new calendar it looks like
   `abc123@group.calendar.google.com`.
   Set that as `GOOGLE_CALENDAR_ID`.

### 6c. The Drive folder (optional — archival only)

1. In Drive create a folder, e.g. "Site archives". **Share** it with the
   service-account email as **Editor**.
2. Open the folder; copy the id from its URL after `/folders/`. Set it as
   `DRIVE_ARCHIVE_FOLDER_ID`.

## Step 7 — Redeploy / restart

After setting the variables, redeploy (Vercel) or restart the local server so
they load. Test: confirm a test appointment (should appear on the calendar),
then mark it completed (a row should appear in the Sheet). If nothing happens,
double-check the sharing in Step 6 and that the JSON in Step 5 is intact.

> Security: the JSON key is a password. Never commit it to git or paste it in
> chat. If it leaks, delete that key in the **Keys** tab and create a new one.
