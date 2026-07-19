import {
  boolean,
  date,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  serial,
  text,
  time,
  timestamp,
} from "drizzle-orm/pg-core";

/**
 * All timestamps are stored as UTC (timestamptz) and rendered in IST
 * (Asia/Kolkata) at the edge — see src/lib/time.js. Never store naive
 * local strings.
 */

export const appointmentStatus = pgEnum("appointment_status", [
  "pending_payment", // slot held, waiting for UPI payment + UTR
  "confirmed", // admin verified the UTR credit
  "completed",
  "cancelled",
  "expired", // hold lapsed unpaid (set lazily, never by a scheduler)
]);

export const consultationMode = pgEnum("consultation_mode", [
  "online",
  "clinic",
]);

export const serviceMode = pgEnum("service_mode", ["online", "clinic", "both"]);

export const overrideKind = pgEnum("override_kind", [
  "blocked", // holiday / blocked date or slot range
  "extra", // additional hours outside the weekly template
]);

export const researchType = pgEnum("research_type", [
  "paper",
  "article",
  "video",
  "pdf",
]);

/** Key–value store: site_mode, research_published, upi_id, upi_number,
 * payee_name, clinic_address, maps_embed_url, notice_banner, contact
 * details, SEO metadata, SMS gateway config, etc. Values are JSON so
 * booleans/objects round-trip without string parsing. */
export const settings = pgTable("settings", {
  key: text("key").primaryKey(),
  value: jsonb("value").notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

/** Single-row doctor profile. *_hi columns are optional Hindi variants —
 * every renderer falls back to the English column when the Hindi one is
 * null/empty. */
export const profile = pgTable("profile", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  tagline: text("tagline"),
  taglineHi: text("tagline_hi"),
  bio: text("bio"),
  bioHi: text("bio_hi"),
  degrees: jsonb("degrees").notNull().default([]), // [{title, institution, year}]
  registrationNumber: text("registration_number"),
  registrationCouncil: text("registration_council"),
  memberships: jsonb("memberships").notNull().default([]), // ["Member, ..."]
  yearsExperience: integer("years_experience"),
  stats: jsonb("stats").notNull().default([]), // [{label, label_hi, value}]
  heroImage: text("hero_image"), // Cloudinary public id / URL
  aboutImage: text("about_image"),
  socialLinks: jsonb("social_links").notNull().default([]),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const services = pgTable("services", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  titleHi: text("title_hi"),
  description: text("description"),
  descriptionHi: text("description_hi"),
  image: text("image"),
  durationMinutes: integer("duration_minutes").notNull(),
  feeInr: integer("fee_inr").notNull(),
  mode: serviceMode("mode").notNull().default("online"),
  isFollowUp: boolean("is_follow_up").notNull().default(false),
  sortOrder: integer("sort_order").notNull().default(0),
  active: boolean("active").notNull().default(true),
});

/** Weekly template the admin edits; public slots are derived, never stored.
 * Times are LOCAL IST wall-clock times (IST has no DST, fixed +05:30). */
export const availabilityRules = pgTable("availability_rules", {
  id: serial("id").primaryKey(),
  weekday: integer("weekday").notNull(), // 0 = Sunday … 6 = Saturday (IST)
  startTime: time("start_time").notNull(), // IST wall clock
  endTime: time("end_time").notNull(), // IST wall clock
  // Vestigial: actual slot length is the booked service's durationMinutes
  // (see getServiceCalendar). Column kept (defaults to 30) but not editable
  // in admin — services of different durations share one weekly window.
  slotLengthMinutes: integer("slot_length_minutes").notNull(),
  mode: consultationMode("mode").notNull().default("online"),
  active: boolean("active").notNull().default(true),
});

/** Date-specific exceptions: holidays, blocked ranges, extra hours.
 * Null start/end time on a "blocked" row blocks the whole day. */
export const slotOverrides = pgTable("slot_overrides", {
  id: serial("id").primaryKey(),
  onDate: date("on_date").notNull(), // IST calendar date
  kind: overrideKind("kind").notNull(),
  startTime: time("start_time"), // IST wall clock, null = whole day
  endTime: time("end_time"),
  slotLengthMinutes: integer("slot_length_minutes"), // for "extra" rows
  mode: consultationMode("mode"), // null = applies to both modes
  note: text("note"),
});

/** Persistent patient record: one row per person, keyed by their NORMALIZED
 * phone (last 10 digits — see src/lib/patients.js). Ties a patient's
 * appointments together so they can view their whole history via a private
 * dashboard_token link. Upserted on every booking. */
export const patients = pgTable("patients", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  phone: text("phone").notNull(), // normalized form (last 10 digits)
  email: text("email"),
  dashboardToken: text("dashboard_token").notNull().unique(),
  address: text("address"), // saved shipping address, reused across medication orders
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

/**
 * Double-booking is prevented by a Postgres EXCLUSION constraint
 * (btree_gist) on tstzrange(start_at, end_at), applied to rows whose
 * status is pending_payment or confirmed, ACROSS both modes (one doctor).
 * Index predicates must be IMMUTABLE so the constraint cannot check
 * hold_expires_at > now() itself — instead every booking transaction first
 * lazily expires stale pending_payment rows (status -> 'expired'), then
 * inserts. See src/lib/booking.js. Defined in the hand-written migration
 * drizzle/0001_booking_exclusion.sql.
 */
export const appointments = pgTable("appointments", {
  id: serial("id").primaryKey(),
  patientName: text("patient_name").notNull(),
  patientPhone: text("patient_phone").notNull(),
  patientEmail: text("patient_email"),
  problemNote: text("problem_note"), // patient's own description at booking
  patientId: integer("patient_id").references(() => patients.id),
  serviceId: integer("service_id")
    .notNull()
    .references(() => services.id),
  mode: consultationMode("mode").notNull(),
  startAt: timestamp("start_at", { withTimezone: true }).notNull(), // UTC
  endAt: timestamp("end_at", { withTimezone: true }).notNull(), // UTC
  status: appointmentStatus("status").notNull().default("pending_payment"),
  amountInr: integer("amount_inr").notNull(),
  utr: text("utr"), // UPI transaction reference entered by patient
  utrSubmittedAt: timestamp("utr_submitted_at", { withTimezone: true }),
  needsReview: boolean("needs_review").notNull().default(false), // paid-but-hold-expired flow
  holdExpiresAt: timestamp("hold_expires_at", { withTimezone: true }),
  intakeAnswers: jsonb("intake_answers"), // pre-consultation case-taking form
  meetingLink: text("meeting_link"), // Google Meet / WhatsApp video
  manageToken: text("manage_token").notNull().unique(), // self-service reschedule/cancel
  reminderSent: boolean("reminder_sent").notNull().default(false),
  doctorNotes: text("doctor_notes"), // private consultation record (CCH guideline)
  googleEventId: text("google_event_id"), // synced Google Calendar event id (best-effort)
  completedAt: timestamp("completed_at", { withTimezone: true }), // set when doctor marks completed
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

/** Admin-marked "display as booked" time ranges (deliberate scarcity — the
 * doctor's own request). Public slot generation renders an overlapping slot as
 * a greyed "Booked" chip and the server rejects bookings/reschedules that
 * overlap one. Display-only: intentionally NOT part of the appointments
 * EXCLUSION constraint. See drizzle/0009_admin_ops.sql. */
export const filledSlots = pgTable("filled_slots", {
  id: serial("id").primaryKey(),
  startAt: timestamp("start_at", { withTimezone: true }).notNull(), // UTC
  endAt: timestamp("end_at", { withTimezone: true }).notNull(), // UTC
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

/** Slim rows kept forever after archival purges old full rows (see plan
 * §3.4): the admin panel still shows every patient's visit history. */
export const appointmentSummaries = pgTable("appointment_summaries", {
  id: serial("id").primaryKey(),
  appointmentId: integer("appointment_id").notNull(),
  patientName: text("patient_name").notNull(),
  patientPhone: text("patient_phone").notNull(),
  serviceTitle: text("service_title").notNull(),
  startAt: timestamp("start_at", { withTimezone: true }).notNull(),
  outcome: text("outcome").notNull(), // completed / cancelled
  archivedAt: timestamp("archived_at", { withTimezone: true }).notNull(),
});

export const faqs = pgTable("faqs", {
  id: serial("id").primaryKey(),
  question: text("question").notNull(),
  questionHi: text("question_hi"),
  answer: text("answer").notNull(), // rich text (markdown)
  answerHi: text("answer_hi"),
  category: text("category").notNull(), // About homoeopathy / Booking & payment / Consultations
  references: jsonb("references").notNull().default([]), // [{ title, url }] — optional Sources list
  sortOrder: integer("sort_order").notNull().default(0),
  published: boolean("published").notNull().default(true),
});

export const caseGallery = pgTable("case_gallery", {
  id: serial("id").primaryKey(),
  condition: text("condition").notNull(),
  conditionHi: text("condition_hi"),
  description: text("description"),
  descriptionHi: text("description_hi"),
  beforeImage: text("before_image"),
  afterImage: text("after_image"),
  treatmentDuration: text("treatment_duration"),
  city: text("city"), // optional patient city (social-proof metadata)
  consentConfirmed: boolean("consent_confirmed").notNull().default(false), // mandatory before publish (compliance)
  published: boolean("published").notNull().default(false),
  sortOrder: integer("sort_order").notNull().default(0),
});

/** One row per condition the doctor treats. Powers /conditions/[slug]
 * detail pages and the homepage Conditions grid. *_hi columns are optional
 * Hindi variants (renderers fall back to English). jsonb arrays:
 *   symptoms/causes: [{ text, text_hi }]
 *   faqs:            [{ q, q_hi, a, a_hi }]
 *   references:      [{ title, url }]  (external Sources list) */
export const conditions = pgTable("conditions", {
  id: serial("id").primaryKey(),
  slug: text("slug").notNull().unique(), // url-safe
  name: text("name").notNull(),
  nameHi: text("name_hi"),
  intro: text("intro"), // short hero paragraph
  introHi: text("intro_hi"),
  overview: text("overview"),
  overviewHi: text("overview_hi"),
  symptoms: jsonb("symptoms").notNull().default([]),
  causes: jsonb("causes").notNull().default([]),
  approach: text("approach"), // how homoeopathy addresses it
  approachHi: text("approach_hi"),
  faqs: jsonb("faqs").notNull().default([]),
  references: jsonb("references").notNull().default([]),
  cardImage: text("card_image"), // photo shown on the homepage "What We Treat" arch card
  sortOrder: integer("sort_order").notNull().default(0),
  published: boolean("published").notNull().default(false),
});

export const testimonials = pgTable("testimonials", {
  id: serial("id").primaryKey(),
  patientId: integer("patient_id").references(() => patients.id), // set when a patient self-submits from their dashboard; null for doctor-entered rows
  patientName: text("patient_name").notNull(), // name or initials
  text: text("text").notNull(),
  textHi: text("text_hi"),
  rating: integer("rating"),
  photo: text("photo"),
  videoUrl: text("video_url"), // optional YouTube (lazy embed) or other link
  condition: text("condition"), // optional condition tag for filter chips
  consentConfirmed: boolean("consent_confirmed").notNull().default(false),
  published: boolean("published").notNull().default(false),
  sortOrder: integer("sort_order").notNull().default(0),
});

/** Section renders publicly only when settings.research_published = true
 * AND at least one visible item exists. */
export const researchItems = pgTable("research_items", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  titleHi: text("title_hi"),
  summary: text("summary"),
  summaryHi: text("summary_hi"),
  type: researchType("type").notNull(),
  linkOrFile: text("link_or_file").notNull(),
  coverImage: text("cover_image"),
  publishedAt: timestamp("published_at", { withTimezone: true }),
  visible: boolean("visible").notNull().default(true),
  sortOrder: integer("sort_order").notNull().default(0),
});

export const adminUsers = pgTable("admin_users", {
  id: serial("id").primaryKey(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(), // bcrypt
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const contactMessages = pgTable("contact_messages", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  phone: text("phone"),
  email: text("email"),
  message: text("message").notNull(),
  read: boolean("read").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

/** Optional lead captured from a self-assessment quiz (T8). The quiz itself
 * is data-module-driven and needs no DB; only this opt-in phone capture
 * writes a row, so the doctor can follow up. quiz_name / result snapshot the
 * outcome at submission time for the admin list. */
export const quizLeads = pgTable("quiz_leads", {
  id: serial("id").primaryKey(),
  quizSlug: text("quiz_slug").notNull(),
  quizName: text("quiz_name").notNull(),
  phone: text("phone").notNull(),
  resultKey: text("result_key").notNull(), // low | moderate | significant
  score: integer("score").notNull(),
  maxScore: integer("max_score").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

/** Admin-editable notification templates, one row per (event, channel).
 * Placeholders: {patient_name} {date} {time} {service} {amount}
 * {meet_link} {manage_link} {upi_id} {doctor_name} */
export const messageTemplates = pgTable("message_templates", {
  id: serial("id").primaryKey(),
  event: text("event").notNull(), // booking_received, payment_received, confirmed, reminder, rescheduled, cancelled, follow_up, medication_dose, medication_refill
  channel: text("channel").notNull(), // email | sms
  subject: text("subject"), // email only
  body: text("body").notNull(),
  bodyHi: text("body_hi"),
  active: boolean("active").notNull().default(true),
});

/** Medicines the doctor parcels herself after a consultation. She creates an
 * order per patient, pricing each duration she medically allows; the patient
 * picks one enabled duration, pays via UPI (manual UTR verification, same as
 * consultations), and a daily cron sends dose reminders + a one-time refill
 * prompt ~3 days before the supply runs out. options is the enabled-durations
 * price list: [{ days: 15|30|60, amountInr: int }]. */
export const medicationOrders = pgTable("medication_orders", {
  id: serial("id").primaryKey(),
  patientId: integer("patient_id")
    .notNull()
    .references(() => patients.id),
  appointmentId: integer("appointment_id").references(() => appointments.id),
  title: text("title").notNull(), // what the medicines are (patient-visible)
  options: jsonb("options").notNull(), // [{ days, amountInr }] — only durations the doctor enabled
  chosenDurationDays: integer("chosen_duration_days"), // set when patient picks
  amountInr: integer("amount_inr"), // set when patient picks (from the matching option)
  status: text("status").notNull().default("pending_payment"), // pending_payment | paid | shipped | cancelled
  address: text("address"), // shipping address for this order
  utr: text("utr"), // UPI transaction reference entered by patient
  utrSubmittedAt: timestamp("utr_submitted_at", { withTimezone: true }),
  paidAt: timestamp("paid_at", { withTimezone: true }),
  shippedAt: timestamp("shipped_at", { withTimezone: true }),
  courierRef: text("courier_ref"),
  refillReminderSent: boolean("refill_reminder_sent").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});
