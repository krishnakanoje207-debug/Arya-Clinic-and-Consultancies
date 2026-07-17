-- Phase B social-proof depth (T5) + FAQ references polish (T6).
-- Testimonials gain an optional video URL and a condition tag (filter chips);
-- success-story cases gain an optional city; FAQs gain an optional Sources list.
-- All columns are additive and default-safe, so existing rows stay valid.

ALTER TABLE "testimonials"
  ADD COLUMN IF NOT EXISTS "video_url" text;
--> statement-breakpoint
ALTER TABLE "testimonials"
  ADD COLUMN IF NOT EXISTS "condition" text;
--> statement-breakpoint
ALTER TABLE "case_gallery"
  ADD COLUMN IF NOT EXISTS "city" text;
--> statement-breakpoint
ALTER TABLE "faqs"
  ADD COLUMN IF NOT EXISTS "references" jsonb NOT NULL DEFAULT '[]'::jsonb;
