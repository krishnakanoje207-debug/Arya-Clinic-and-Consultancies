-- Admin ops (Phase 4): scarcity slots + Google Sheet/Calendar sync bookkeeping.
--
-- filled_slots: admin-marked "display as booked" time ranges. The doctor can
-- manually mark open slots as booked to create deliberate scarcity on her own
-- site (her explicit request). Public slot generation treats a filled_slots
-- overlap exactly like a real booking (greyed "Booked" chip) and the server
-- rejects any booking/reschedule that overlaps one. These are display-only and
-- deliberately do NOT participate in the appointments EXCLUSION constraint.
--
-- appointments.google_event_id: the id of the synced Google Calendar event
-- (null when Calendar sync is unconfigured or the event was never created).
-- appointments.completed_at: when the doctor marked the consult completed
-- (drives the /admin/queue "Completed" bucket + the Sheets export timestamp).
-- Keep src/db/schema.js in sync.

CREATE TABLE "filled_slots" (
  "id" serial PRIMARY KEY,
  "start_at" timestamptz NOT NULL,
  "end_at" timestamptz NOT NULL,
  "created_at" timestamptz NOT NULL DEFAULT now()
);
--> statement-breakpoint

CREATE INDEX "filled_slots_start_at_idx" ON "filled_slots" ("start_at");
--> statement-breakpoint

ALTER TABLE "appointments"
  ADD COLUMN "google_event_id" text;
--> statement-breakpoint

ALTER TABLE "appointments"
  ADD COLUMN "completed_at" timestamptz;
