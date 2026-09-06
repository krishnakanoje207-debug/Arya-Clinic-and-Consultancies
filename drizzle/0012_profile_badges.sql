-- Profile badges: the small pills shown beside the doctor's name in the hero
-- (e.g. "BHMS"). Kept separate from profile.degrees on purpose — a degree is a
-- credential with an institution and year and belongs in the About
-- qualifications list, whereas a badge is purely a short display label the
-- doctor can add or remove at will from /admin/content.
--
-- Shape: [{ "label": "BHMS", "label_hi": "बीएचएमएस" }]. label_hi is optional;
-- the renderer falls back to label, matching profile.stats. Keep
-- src/db/schema.js in sync.

ALTER TABLE "profile"
  ADD COLUMN "badges" jsonb NOT NULL DEFAULT '[]'::jsonb;

-- Backfill from the degree titles that used to be rendered as the hero chips,
-- so an existing site keeps showing its BHMS pill without the doctor having to
-- retype it.
UPDATE "profile"
SET "badges" = COALESCE(
  (
    SELECT jsonb_agg(jsonb_build_object('label', d->>'title'))
    FROM jsonb_array_elements("degrees") AS d
    WHERE COALESCE(d->>'title', '') <> ''
  ),
  '[]'::jsonb
)
WHERE "badges" = '[]'::jsonb;
