-- Recurring breaks in the weekly schedule.
--
-- A lunch break could only be expressed two ways before this: as two separate
-- open windows either side of it, or as a date-specific "blocked" override
-- re-entered every single day. Neither is something a practice keeps up with.
-- A rule now carries a kind: "open" windows generate slots, "break" windows
-- are subtracted from them on that weekday, every week.
--
-- Existing rules are all open windows, which is what the DEFAULT gives them.

CREATE TYPE "availability_kind" AS ENUM ('open', 'break');
--> statement-breakpoint

ALTER TABLE "availability_rules"
  ADD COLUMN "kind" "availability_kind" NOT NULL DEFAULT 'open';
