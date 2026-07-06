# Fix Plan — 2026-07-06 (user bug review)

> **STATUS — ALL CLOSED (2026-07-06).** O1–O5 done by Opus 4.8; Fable review pass done
> (build + eslint + smoke 8/8 re-verified on a clean .next; fixed swapped Cloudinary
> values in .env.example; flagged that the repo has everything uncommitted on top of the
> initial CNA commit). **F1 RESOLVED: user chose Option A — keep manual UTR + one-tap
> confirm. Nothing to build; B (bank-SMS match) / C (gateway) remain documented upgrade
> paths if booking volume grows.**

Executor: **Opus 4.8** does ALL implementation tasks below (O1–O5). **Fable** only reviews
the finished diff and handles the payment-automation decision (F1) if the user opts in.
Work against the live local stack: `docker compose up -d` + `npm run dev`
(admin login `admin@arya.local` / `AryaAdmin@2026`). Read `AGENTS.md` first (Next 16!).

## ✅ Done summary
- **O1** ✅ EntityManager now renders from serializable `format` descriptors
  (`bool`/`humanize`/`rupees`/`map`); all 11 `render:` fns removed across the 4 pages.
  `scripts/smoke-admin.mjs` added (`npm run smoke:admin`). Admin mobile nav =
  `AdminMobileNav.jsx` wired into the panel layout. Availability(slots) & Content▸Services
  (categories) now reachable — answers user #7.
- **O2** ✅ Public sections → `max-w-7xl` + full-bleed alternating bands; admin `max-w-7xl`
  wrapper dropped (full width). Hero `md:min-h-[72vh]`. New density sections
  `Conditions.jsx` (chips from specialties) + `WhyArya.jsx` (3 cards); Services/Testimonials/
  Research grids go 4-across on xl. New i18n keys in en.json + hi.json.
- **O3** ✅ `scripts/gen-icons-from-logo.mjs` (sharp + png-to-ico, `npm run icons`) builds
  clean circular PNGs + `favicon.ico` from the badge photo (darkness-bbox + navy-disc
  backing removes the beige/ragged rim). Header/footer use `arya-logo.png`; favicon.ico
  wired in layout metadata. LIMIT: source is a tilted photo → faint ring asymmetry; a
  client vector/PNG export would make it pixel-perfect.
- **O4/O5** ✅ build+eslint+smoke+E2E green; this status block updated.

---

## O1 — P0: Admin pages 500 (EntityManager RSC crash) — user issues #2 and #7

**Symptom:** `/admin/availability`, `/admin/content`, `/admin/research`, `/admin/templates`
all return HTTP 500. User perceives "admin buttons not working, only dashboard visible."

**Root cause (confirmed in dev log):**
`Error: Functions cannot be passed directly to Client Components` — the server pages pass
`columns: [{ key, label, render: fn }]` into the `"use client"` `EntityManager.jsx`.
RSC cannot serialize functions. 11 `render:` occurrences across the 4 page files.

**Fix:** replace every `render:` function with a serializable descriptor and move the
rendering logic INTO EntityManager (client side). Suggested: `{ key, label, format: "..." }`
where EntityManager implements formats it finds in use — inspect all 11 call sites first;
expected formats ≈ `boolean-badge` (Active/Visible/Published), `date`, `truncate:N`,
`code` (event names). If a call site needs something a format string can't express,
prefer a small named format over reintroducing functions.

**Regression guard:** add `scripts/smoke-admin.mjs` — logs in via
`/api/auth/csrf` → POST `/api/auth/callback/credentials` (reads ADMIN_* from .env),
fetches all 8 admin routes, exits non-zero on any non-200. Run it; all 8 must pass.
(This bug survived because `next build` never renders force-dynamic pages and old smoke
tests only hit public routes.)

**Also (same area):** admin sidebar is `hidden md:flex` with NO narrow-screen alternative
→ on a window <768px the admin has zero navigation. Add a mobile disclosure nav to
`src/app/admin/(panel)/layout.js` (reuse the pattern from `src/components/MobileNav.jsx`).

**After the fix, verify user issue #7 is satisfied and note it in the report:**
- Add/remove time slots = `/admin/availability` (weekly rules + date overrides).
- Add consultation categories = `/admin/content` → Services CRUD.
Both exist; they were unreachable only because of the 500s.

## O2 — P1: Site doesn't fill laptop screen + too much empty space — issues #1 and #5

Public sections cap at `max-w-6xl` (1152px) with `py-16`; on 1920px screens the page is
~60% margin. Admin caps at `max-w-7xl`.

- Public: raise section containers to `max-w-7xl` and give alternating sections
  full-bleed background bands (cream / sage-soft / white) so color spans the whole
  viewport width even where text is capped. Reduce vertical rhythm where sparse
  (`py-16` → `py-12` for thin sections). Hero: consider `min-h-[70vh]` two-column with
  the portrait + stats so it fills the fold.
- Admin: drop the `max-w-7xl` wrapper — sidebar + `flex-1` main with padding, full width.
- Density (issue #5): the page FEELS empty partly because seeded content is thin. Add:
  a "Conditions we treat" chip/card section sourced from the specialties in the seeded
  bio (women's health, paediatrics, asthma, skin, diabetes/obesity/hair loss); a
  3-card "Why ARYA / approach" band; make services grid 4-across on xl. Keep copy
  consistent with the seeded tone; add any new strings to BOTH messages/en.json and hi.json.
- Verify with headless-Edge screenshots at 1366x768 AND 1920x1080 (method in memory:
  `msedge --headless=new --screenshot=... --window-size=...`). Remember the blob-overlay
  trap: absolute inset-0 overflow-hidden containers only.

## O3 — P1: Favicon from the real logo + fix ragged logo — issues #3 and #4

Current favicon/PWA icons are the generated sage-crescent placeholders
(`scripts/gen-icons.mjs`), not the ARYA logo. `public/brand/arya-logo.jpeg` is 1600x900
JPEG (round badge) with visible compression artifacts, shown scaled to 48px circles.

- Add `sharp` as a devDependency (build-time only; do NOT import at runtime).
- New `scripts/gen-icons-from-logo.mjs`: load the jpeg, locate/center-crop the square
  around the round badge, apply circular alpha mask + mild sharpen, export:
  `public/icons/icon-192.png`, `icon-512.png`, `apple-touch-icon.png` (180),
  `public/favicon.ico` (16+32+48 multi-size), and a clean display asset
  `public/brand/arya-logo.png` at 256x256 (transparent circle, sharpened).
- Switch `SiteHeader.jsx` + `SiteFooter.jsx` to the new `.png` (fixes the ragged look —
  it's mostly JPEG edge artifacts on the circle border).
- Add `icons.icon` entry for `/favicon.ico` in `src/app/layout.js` metadata (keep PNG
  entries). App Router also serves `src/app/favicon.ico` automatically if placed there —
  either wiring is fine, pick one and be consistent.
- True quality limit: we cannot AI-upscale locally; crop+mask+sharpen at exact display
  sizes removes the raggedness. If still unsatisfying, ask client for the original
  logo export (vector/PNG) — note that in the report.

## O4 — P2: update docs/memory hooks

Update `.env.example` comment block if scripts change; keep `PLAN` checkboxes updated;
final `npm run build` + `npx eslint src` + `scripts/smoke-admin.mjs` all clean.

## O5 — P2: full verification pass

1. `npm run build` clean, eslint clean.
2. smoke-admin: 8/8 pages 200.
3. Manual E2E once through booking: create booking → submit UTR → admin confirm.
4. Screenshots (2 viewport sizes) attached/described in final report.

---

## F1 — Fable (only if user opts in): payment auto-confirmation design — issue #6

**Answer to the user's question:** with plain UPI (no gateway) there is NO official way
for software to know a payment arrived — banks/NPCI expose no free consumer API. Options:

| Option | Auto? | Cost | Effort | Notes |
|---|---|---|---|---|
| A. Keep manual UTR + one-tap confirm (current) | no | ₹0 | done | doctor checks GPay, taps Confirm |
| B. Bank-SMS matching via the textbee phone (8999758063 receives credit SMS → poll textbee received-SMS API → match amount/UTR → auto- or one-click-confirm) | semi/full | ₹0 | medium | fragile: depends on SMS format & phone online; needs textbee set up on that phone |
| C. Payment gateway (Razorpay/Cashfree Payment Links or UPI intent + webhook) | fully | ~2% per txn + KYC onboarding | medium | the only robust automation; changes the locked "UPI-only, zero-fee" decision |

Recommendation: stay on A for launch; add B as an assist if the client installs textbee
on 8999758063 anyway (it's already the planned SMS-sending device); revisit C only if
booking volume makes manual confirmation painful. **Do not build B or C until the user
picks.**
