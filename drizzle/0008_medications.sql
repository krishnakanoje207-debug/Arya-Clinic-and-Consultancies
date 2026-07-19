-- Medication orders (Phase 3): medicines the doctor parcels herself after a
-- consultation. She creates one order per patient, pricing each duration she
-- medically allows (options jsonb: [{days, amountInr}]); the patient picks one
-- enabled duration, enters a shipping address and pays via UPI (manual UTR
-- verification, same model as consultations). status flows
-- pending_payment -> paid -> shipped (or cancelled). A daily cron sends dose
-- reminders while the supply is active and a one-time refill prompt ~3 days
-- before it runs out (refill_reminder_sent guards the one-time send). Keep
-- src/db/schema.js in sync.

CREATE TABLE "medication_orders" (
  "id" serial PRIMARY KEY,
  "patient_id" integer NOT NULL REFERENCES "patients"("id"),
  "appointment_id" integer REFERENCES "appointments"("id"),
  "title" text NOT NULL,
  "options" jsonb NOT NULL,
  "chosen_duration_days" integer,
  "amount_inr" integer,
  "status" text NOT NULL DEFAULT 'pending_payment',
  "address" text,
  "utr" text,
  "utr_submitted_at" timestamptz,
  "paid_at" timestamptz,
  "shipped_at" timestamptz,
  "courier_ref" text,
  "refill_reminder_sent" boolean NOT NULL DEFAULT false,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "updated_at" timestamptz NOT NULL DEFAULT now()
);
--> statement-breakpoint

CREATE INDEX "medication_orders_patient_id_idx" ON "medication_orders" ("patient_id");
--> statement-breakpoint

-- Saved shipping address, reused across a patient's orders (mirrored onto the
-- patients row on each medication payment).
ALTER TABLE "patients"
  ADD COLUMN "address" text;
