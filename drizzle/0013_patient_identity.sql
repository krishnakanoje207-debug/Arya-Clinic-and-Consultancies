-- Patient identity becomes (normalized phone + normalized name), not phone alone.
--
-- Before this, booking for someone else on your own number collapsed both
-- people into ONE patients row: the upsert matched on phone, OVERWROTE the
-- stored name, and filed the new appointment under your patient_id. Both
-- people's appointments, problem notes and medication orders then sat behind
-- a single permanent dashboard token — each could read the other's health
-- details. Adding the name to the key gives every person their own row and
-- their own magic link while the contact phone stays shared, which is what
-- booking on behalf of a child or parent actually needs.
--
-- normalize: collapse every run of whitespace to one space, trim, lowercase.
-- This mirrors normalizeName() in src/lib/patients.js EXACTLY — change both
-- together. The character class is spelled out rather than written as \s:
-- inside a Postgres bracket expression \s is inert, and even outside one it
-- misses NBSP, BOM and the Unicode spaces that JavaScript's \s matches. A
-- pasted name containing a non-breaking space would otherwise normalize
-- differently on each side, silently splitting that patient into a second
-- record with a second dashboard token.

ALTER TABLE "patients" ADD COLUMN "name_key" text;
--> statement-breakpoint

UPDATE "patients"
SET "name_key" = lower(
  btrim(
    regexp_replace(
      "name",
      '[[:space:]\u00A0\u1680\u2000-\u200A\u2028\u2029\u202F\u205F\u3000\uFEFF]+',
      ' ',
      'g'
    ),
    ' '
  )
);
--> statement-breakpoint

ALTER TABLE "patients" ALTER COLUMN "name_key" SET NOT NULL;
--> statement-breakpoint

-- Phone alone is no longer unique: one number may now carry several people.
DROP INDEX "patients_phone_idx";
--> statement-breakpoint

CREATE UNIQUE INDEX "patients_phone_name_idx" ON "patients" ("phone", "name_key");
--> statement-breakpoint

-- Non-unique lookup index: phone is no longer unique but is still the natural
-- way to find everyone booked under one contact number (the admin patient list).
CREATE INDEX "patients_phone_lookup_idx" ON "patients" ("phone");
