# Dr. Seema — Homoeopathy Portfolio & Booking Site

Full-stack Next.js 16 (App Router, **JavaScript**) implementation of the v1.4
plan. Zero-recurring-cost stack: Neon Postgres · Drizzle · Cloudinary ·
Gmail SMTP · textbee Android SMS gateway · Vercel Hobby.

## Getting started

```bash
cp .env.example .env        # fill in DATABASE_URL etc.
npm install
npm run db:migrate          # applies drizzle/0000_init.sql (btree_gist + EXCLUSION constraint)
npm run db:seed             # placeholder content, FAQs, 7 notification templates, admin user
npm run dev
```

The site renders with empty/placeholder sections even **without** a database
(all content reads fall back safely) so the UI can be developed before Neon is
provisioned.

## Architecture

- `src/db/schema.js` — Drizzle schema (11 tables). The **EXCLUSION constraint**
  that makes double-booking impossible lives in `drizzle/0000_init.sql` (it
  can't be expressed in the Drizzle schema). Keep the two in sync.
- `src/lib/booking.js` — slot generation, **lazy hold-expiry** (no scheduler),
  race-safe booking via the exclusion constraint, UTR flow. UTC storage,
  IST rendering (`src/lib/time.js`).
- `src/lib/settings.js` / `src/lib/content.js` — DB-backed, admin-editable
  content with English→Hindi fallback (`localized()`).
- `src/app/(site)/` — public site (Hero, About, Services, Success Stories,
  Testimonials, Research, FAQ, Contact) + `/book` flow + policy pages.
- `src/app/admin/` — dashboard, appointments (payment verify/confirm),
  availability, content editors, research CRUD, settings (clinic-mode +
  research-publish toggles, UPI, contact, SMS gateway).
- `src/app/api/cron/reminders/` — once-daily reminder batch (Vercel Hobby cron,
  `vercel.json`), `CRON_SECRET`-protected.
- i18n: `next-intl`, cookie-based EN/HI toggle (`messages/`).
- PWA: `public/manifest.webmanifest` + `public/sw.js` (offline fallback).

## Build log

| Area | Status |
| --- | --- |
| Scaffold, schema + migration, booking engine, public UI, admin CRUD, research, clinic mode, i18n, PWA, SEO, seeds | done |
| Auth.js v5 credentials login (`/admin/login`), Account/change-password, `proxy.js` rate limiting, zod validation, per-phone hold cap | done |
| Notification adapter (`src/lib/notify/` — Gmail SMTP + textbee SMS + `.ics`), wired to all booking events + daily reminder cron; real token reschedule (same-row move, 23P01-safe); admin confirm 23P01 handling; test-SMS button | done |
| Bug-fix + feature batch: storage-meter `.rows`, PWA icons (`scripts/gen-icons.mjs`), mobile nav, slotLength vestige, seed idempotency, checkbox defaults, `SafeImage` host guard, templates editor, CSV export, gallery filter, sitemap/robots, Hindi stat labels, cancel cutoff; real ARYA/Dr. Seema Prajapati client data seeded | done |
| Storage archival tool (`src/lib/archive.js` — deliver-then-purge, Drive optional), ARYA lotus theme + animations (Reveal, blobs, swoosh, card lifts), no-DB fallbacks with real client data, brand settings fields | done |

**All planned tasks are complete.** Remaining before launch: provision Neon,
fill `.env`, `db:migrate` + `db:seed`, enter the client's outstanding details
(fees, contacts, photos), deploy to Vercel.

Admin auth is real (Auth.js v5, JWT sessions, 8h expiry). Set `AUTH_SECRET`
and run `npm run db:seed` (creates the owner account from `ADMIN_EMAIL` /
`ADMIN_PASSWORD`) before first login.

**Brand:** ARYA — "Healing starts here". Dr. Seema Prajapati (BHMS). Assets in
`public/brand/`. UPI `seema.kanoje18-1@oksbi` seeded. Still-missing client
details (phone/email/fees/case photos/testimonials) are admin-editable.

## Next 16 notes

Turbopack is default; `cookies()`/`params`/`searchParams` are async;
`middleware` → `proxy` (relevant to the pending security task).
