-- Dr. Seema Homoeopathy — initial schema.
-- This file is the AUTHORITATIVE DDL (drizzle-kit cannot express the
-- EXCLUSION constraint below, so the schema is hand-migrated). Keep
-- src/db/schema.js in sync with the table definitions here.

CREATE EXTENSION IF NOT EXISTS btree_gist;
--> statement-breakpoint

CREATE TYPE "appointment_status" AS ENUM ('pending_payment','confirmed','completed','cancelled','expired');
--> statement-breakpoint
CREATE TYPE "consultation_mode" AS ENUM ('online','clinic');
--> statement-breakpoint
CREATE TYPE "service_mode" AS ENUM ('online','clinic','both');
--> statement-breakpoint
CREATE TYPE "override_kind" AS ENUM ('blocked','extra');
--> statement-breakpoint
CREATE TYPE "research_type" AS ENUM ('paper','article','video','pdf');
--> statement-breakpoint

CREATE TABLE "settings" (
  "key" text PRIMARY KEY,
  "value" jsonb NOT NULL,
  "updated_at" timestamptz NOT NULL DEFAULT now()
);
--> statement-breakpoint

CREATE TABLE "profile" (
  "id" serial PRIMARY KEY,
  "name" text NOT NULL,
  "tagline" text,
  "tagline_hi" text,
  "bio" text,
  "bio_hi" text,
  "degrees" jsonb NOT NULL DEFAULT '[]'::jsonb,
  "registration_number" text,
  "registration_council" text,
  "years_experience" integer,
  "stats" jsonb NOT NULL DEFAULT '[]'::jsonb,
  "hero_image" text,
  "about_image" text,
  "social_links" jsonb NOT NULL DEFAULT '[]'::jsonb,
  "updated_at" timestamptz NOT NULL DEFAULT now()
);
--> statement-breakpoint

CREATE TABLE "services" (
  "id" serial PRIMARY KEY,
  "title" text NOT NULL,
  "title_hi" text,
  "description" text,
  "description_hi" text,
  "image" text,
  "duration_minutes" integer NOT NULL,
  "fee_inr" integer NOT NULL,
  "mode" service_mode NOT NULL DEFAULT 'online',
  "is_follow_up" boolean NOT NULL DEFAULT false,
  "sort_order" integer NOT NULL DEFAULT 0,
  "active" boolean NOT NULL DEFAULT true
);
--> statement-breakpoint

CREATE TABLE "availability_rules" (
  "id" serial PRIMARY KEY,
  "weekday" integer NOT NULL,
  "start_time" time NOT NULL,
  "end_time" time NOT NULL,
  "slot_length_minutes" integer NOT NULL,
  "mode" consultation_mode NOT NULL DEFAULT 'online',
  "active" boolean NOT NULL DEFAULT true
);
--> statement-breakpoint

CREATE TABLE "slot_overrides" (
  "id" serial PRIMARY KEY,
  "on_date" date NOT NULL,
  "kind" override_kind NOT NULL,
  "start_time" time,
  "end_time" time,
  "slot_length_minutes" integer,
  "mode" consultation_mode,
  "note" text
);
--> statement-breakpoint

CREATE TABLE "appointments" (
  "id" serial PRIMARY KEY,
  "patient_name" text NOT NULL,
  "patient_phone" text NOT NULL,
  "patient_email" text,
  "service_id" integer NOT NULL REFERENCES "services"("id"),
  "mode" consultation_mode NOT NULL,
  "start_at" timestamptz NOT NULL,
  "end_at" timestamptz NOT NULL,
  "status" appointment_status NOT NULL DEFAULT 'pending_payment',
  "amount_inr" integer NOT NULL,
  "utr" text,
  "utr_submitted_at" timestamptz,
  "needs_review" boolean NOT NULL DEFAULT false,
  "hold_expires_at" timestamptz,
  "intake_answers" jsonb,
  "meeting_link" text,
  "manage_token" text NOT NULL UNIQUE,
  "reminder_sent" boolean NOT NULL DEFAULT false,
  "doctor_notes" text,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "updated_at" timestamptz NOT NULL DEFAULT now()
);
--> statement-breakpoint

-- Double-booking guard: no two ACTIVE appointments may overlap in time,
-- across BOTH modes (the doctor is one person). tstzrange defaults to
-- '[)' bounds so back-to-back slots (…10:30 and 10:30…) do not collide.
-- The predicate is IMMUTABLE (no now()/hold_expires_at), so the booking
-- transaction must first lazily flip stale pending_payment rows to
-- 'expired' — then they fall out of this predicate and never block.
ALTER TABLE "appointments"
  ADD CONSTRAINT "appointments_no_overlap"
  EXCLUDE USING gist (tstzrange("start_at","end_at") WITH &&)
  WHERE ("status" IN ('pending_payment','confirmed'));
--> statement-breakpoint

CREATE INDEX "appointments_status_hold_idx" ON "appointments" ("status","hold_expires_at");
--> statement-breakpoint
CREATE INDEX "appointments_start_idx" ON "appointments" ("start_at");
--> statement-breakpoint

CREATE TABLE "appointment_summaries" (
  "id" serial PRIMARY KEY,
  "appointment_id" integer NOT NULL,
  "patient_name" text NOT NULL,
  "patient_phone" text NOT NULL,
  "service_title" text NOT NULL,
  "start_at" timestamptz NOT NULL,
  "outcome" text NOT NULL,
  "archived_at" timestamptz NOT NULL
);
--> statement-breakpoint

CREATE TABLE "faqs" (
  "id" serial PRIMARY KEY,
  "question" text NOT NULL,
  "question_hi" text,
  "answer" text NOT NULL,
  "answer_hi" text,
  "category" text NOT NULL,
  "sort_order" integer NOT NULL DEFAULT 0,
  "published" boolean NOT NULL DEFAULT true
);
--> statement-breakpoint

CREATE TABLE "case_gallery" (
  "id" serial PRIMARY KEY,
  "condition" text NOT NULL,
  "condition_hi" text,
  "description" text,
  "description_hi" text,
  "before_image" text,
  "after_image" text,
  "treatment_duration" text,
  "consent_confirmed" boolean NOT NULL DEFAULT false,
  "published" boolean NOT NULL DEFAULT false,
  "sort_order" integer NOT NULL DEFAULT 0
);
--> statement-breakpoint

CREATE TABLE "testimonials" (
  "id" serial PRIMARY KEY,
  "patient_name" text NOT NULL,
  "text" text NOT NULL,
  "text_hi" text,
  "rating" integer,
  "photo" text,
  "consent_confirmed" boolean NOT NULL DEFAULT false,
  "published" boolean NOT NULL DEFAULT false,
  "sort_order" integer NOT NULL DEFAULT 0
);
--> statement-breakpoint

CREATE TABLE "research_items" (
  "id" serial PRIMARY KEY,
  "title" text NOT NULL,
  "title_hi" text,
  "summary" text,
  "summary_hi" text,
  "type" research_type NOT NULL,
  "link_or_file" text NOT NULL,
  "cover_image" text,
  "published_at" timestamptz,
  "visible" boolean NOT NULL DEFAULT true,
  "sort_order" integer NOT NULL DEFAULT 0
);
--> statement-breakpoint

CREATE TABLE "admin_users" (
  "id" serial PRIMARY KEY,
  "email" text NOT NULL UNIQUE,
  "password_hash" text NOT NULL,
  "created_at" timestamptz NOT NULL DEFAULT now()
);
--> statement-breakpoint

CREATE TABLE "contact_messages" (
  "id" serial PRIMARY KEY,
  "name" text NOT NULL,
  "phone" text,
  "email" text,
  "message" text NOT NULL,
  "read" boolean NOT NULL DEFAULT false,
  "created_at" timestamptz NOT NULL DEFAULT now()
);
--> statement-breakpoint

CREATE TABLE "message_templates" (
  "id" serial PRIMARY KEY,
  "event" text NOT NULL,
  "channel" text NOT NULL,
  "subject" text,
  "body" text NOT NULL,
  "body_hi" text,
  "active" boolean NOT NULL DEFAULT true
);
