-- "Available only these hours" date overrides.
--
-- A day on which the doctor can give only part of her usual time used to take
-- two overrides: a block over her normal hours plus an extra window, and she
-- had to remember what her normal hours were. An "only" override replaces the
-- weekly hours for that one date; breaks, partial blocks and whole-day
-- holidays still apply on top (see dayWindows in src/lib/booking.js).

ALTER TYPE "override_kind" ADD VALUE IF NOT EXISTS 'only';
