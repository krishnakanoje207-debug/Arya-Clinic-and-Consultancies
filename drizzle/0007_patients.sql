-- Persistent patients + patient dashboard (Phase 2).
-- One row per person, keyed by their NORMALIZED phone (last 10 digits, so
-- +91 / leading-zero / spacing variants collapse to the same patient). The
-- normalization here is mirrored exactly in src/lib/patients.js
-- normalizePhone(). dashboard_token is an unguessable per-patient link to a
-- private dashboard (gen_random_uuid() is built into PG13+/Neon — no
-- extension needed). Keep src/db/schema.js in sync.

CREATE TABLE "patients" (
  "id" serial PRIMARY KEY,
  "name" text NOT NULL,
  "phone" text NOT NULL,
  "email" text,
  "dashboard_token" text NOT NULL DEFAULT gen_random_uuid(),
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "updated_at" timestamptz NOT NULL DEFAULT now()
);
--> statement-breakpoint

CREATE UNIQUE INDEX "patients_phone_idx" ON "patients" ("phone");
--> statement-breakpoint
CREATE UNIQUE INDEX "patients_dashboard_token_idx" ON "patients" ("dashboard_token");
--> statement-breakpoint

ALTER TABLE "appointments"
  ADD COLUMN "patient_id" integer REFERENCES "patients"("id");
--> statement-breakpoint

-- Backfill: one patient per distinct normalized phone from existing
-- appointments. name/email/created_at all come from that phone's MOST
-- RECENT appointment (single DISTINCT ON pass — the simplest correct form;
-- created_at therefore reflects the latest booking, which is fine for a
-- backfill).
INSERT INTO "patients" ("name", "email", "phone", "created_at")
SELECT DISTINCT ON (norm) patient_name, patient_email, norm, created_at
FROM (
  SELECT
    patient_name,
    patient_email,
    created_at,
    CASE
      WHEN length(regexp_replace(patient_phone, '\D', '', 'g')) > 10
        THEN right(regexp_replace(patient_phone, '\D', '', 'g'), 10)
      ELSE regexp_replace(patient_phone, '\D', '', 'g')
    END AS norm
  FROM "appointments"
) s
ORDER BY norm, created_at DESC;
--> statement-breakpoint

-- Link every appointment to its patient via the same normalization.
UPDATE "appointments" a
SET "patient_id" = p."id"
FROM "patients" p
WHERE p."phone" = CASE
  WHEN length(regexp_replace(a.patient_phone, '\D', '', 'g')) > 10
    THEN right(regexp_replace(a.patient_phone, '\D', '', 'g'), 10)
  ELSE regexp_replace(a.patient_phone, '\D', '', 'g')
END;
