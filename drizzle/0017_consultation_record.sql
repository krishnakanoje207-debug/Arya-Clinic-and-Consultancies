-- What the doctor records when she finishes a consultation.
--
-- "Start consultation" on the dashboard opens three fields; "Mark completed"
-- saves them with the status change and appends them to the Google Sheet.
-- next_appointment_on is a plain IST calendar date (no time): it is shown on
-- the patient's dashboard and on their medication orders as the date the
-- doctor wants to see them again. All three stay null on older rows.

ALTER TABLE "appointments" ADD COLUMN "reported_symptoms" text;
--> statement-breakpoint
ALTER TABLE "appointments" ADD COLUMN "medicines_prescribed" text;
--> statement-breakpoint
ALTER TABLE "appointments" ADD COLUMN "next_appointment_on" date;
