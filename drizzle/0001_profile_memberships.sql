-- Add profile.memberships (advisory/professional memberships list).
-- JSON array of strings, defaults to [] so existing rows stay valid.
ALTER TABLE "profile"
  ADD COLUMN IF NOT EXISTS "memberships" jsonb NOT NULL DEFAULT '[]'::jsonb;
