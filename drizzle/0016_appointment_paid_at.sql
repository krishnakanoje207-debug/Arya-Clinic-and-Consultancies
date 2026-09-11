-- When a consultation was paid, for its receipt.
--
-- Medication orders already record paid_at; appointments only kept the
-- Razorpay payment id. confirmPaidAppointment now stamps paid_at when a
-- booking is confirmed. Rows confirmed before this get their booking time:
-- payment happens inside the 15-minute hold that starts at created_at, so the
-- date is right and the time is within minutes.

ALTER TABLE "appointments" ADD COLUMN "paid_at" timestamp with time zone;
--> statement-breakpoint

UPDATE "appointments"
  SET "paid_at" = "created_at"
  WHERE "status" IN ('confirmed', 'completed') AND "paid_at" IS NULL;
