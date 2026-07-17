-- Condition detail pages (T1): one row per condition the doctor treats,
-- with bilingual copy and jsonb arrays for symptoms/causes/faqs/references.
-- Public pages live at /conditions/[slug]; only published rows are exposed.

CREATE TABLE "conditions" (
  "id" serial PRIMARY KEY,
  "slug" text NOT NULL UNIQUE,
  "name" text NOT NULL,
  "name_hi" text,
  "intro" text,
  "intro_hi" text,
  "overview" text,
  "overview_hi" text,
  "symptoms" jsonb NOT NULL DEFAULT '[]'::jsonb,
  "causes" jsonb NOT NULL DEFAULT '[]'::jsonb,
  "approach" text,
  "approach_hi" text,
  "faqs" jsonb NOT NULL DEFAULT '[]'::jsonb,
  "references" jsonb NOT NULL DEFAULT '[]'::jsonb,
  "sort_order" integer NOT NULL DEFAULT 0,
  "published" boolean NOT NULL DEFAULT false
);
