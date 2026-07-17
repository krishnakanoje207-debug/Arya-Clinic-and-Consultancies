-- Phase C self-assessment quiz (T8). Opt-in phone leads captured from the
-- Women's Health self-check. The quiz itself is data-module-driven and needs
-- no DB; only this table stores the optional follow-up request. Additive and
-- IF NOT EXISTS so re-running is safe.

CREATE TABLE IF NOT EXISTS "quiz_leads" (
  "id" serial PRIMARY KEY NOT NULL,
  "quiz_slug" text NOT NULL,
  "quiz_name" text NOT NULL,
  "phone" text NOT NULL,
  "result_key" text NOT NULL,
  "score" integer NOT NULL,
  "max_score" integer NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);
