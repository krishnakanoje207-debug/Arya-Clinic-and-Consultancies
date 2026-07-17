-- v2.1 reference alignment: per-condition photo for the homepage
-- "What We Treat" arch cards. Admin-editable (/admin/conditions), with a
-- static /photos default in the seed + code fallback. Additive and
-- IF NOT EXISTS so re-running is safe.

ALTER TABLE "conditions" ADD COLUMN IF NOT EXISTS "card_image" text;
--> statement-breakpoint
-- Backfill the six seeded conditions so existing rows (migrated before this
-- column existed) show their matching photo without a re-seed. Only sets rows
-- that are still null, so admin overrides are never clobbered.
UPDATE "conditions" SET "card_image" = '/photos/womens-health.jpg' WHERE "slug" = 'pcos' AND "card_image" IS NULL;
--> statement-breakpoint
UPDATE "conditions" SET "card_image" = '/photos/uterine-fibroids.jpg' WHERE "slug" = 'uterine-fibroids' AND "card_image" IS NULL;
--> statement-breakpoint
UPDATE "conditions" SET "card_image" = '/photos/asthma.jpg' WHERE "slug" = 'asthma' AND "card_image" IS NULL;
--> statement-breakpoint
UPDATE "conditions" SET "card_image" = '/photos/eczema.jpg' WHERE "slug" = 'eczema' AND "card_image" IS NULL;
--> statement-breakpoint
UPDATE "conditions" SET "card_image" = '/photos/child-immunity.jpg' WHERE "slug" = 'child-immunity' AND "card_image" IS NULL;
--> statement-breakpoint
UPDATE "conditions" SET "card_image" = '/photos/hair-loss.jpg' WHERE "slug" = 'hair-loss' AND "card_image" IS NULL;
