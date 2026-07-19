-- Phase 3 (Razorpay): the manual UPI/UTR flow is replaced entirely by Razorpay
-- as the ONLY payment path for both consultations and medication orders. A
-- webhook (payment.captured) auto-confirms. These columns record the gateway's
-- order / payment / refund identifiers so the webhook can correlate an event
-- back to its row and the admin can see payment provenance. The historical
-- utr / utr_submitted_at columns are intentionally KEPT (old rows) but are no
-- longer written. Keep src/db/schema.js in sync.

ALTER TABLE "appointments"
  ADD COLUMN "razorpay_order_id" text,
  ADD COLUMN "razorpay_payment_id" text,
  ADD COLUMN "razorpay_refund_id" text;
--> statement-breakpoint

ALTER TABLE "medication_orders"
  ADD COLUMN "razorpay_order_id" text,
  ADD COLUMN "razorpay_payment_id" text,
  ADD COLUMN "razorpay_refund_id" text;
--> statement-breakpoint

-- The Razorpay order id is the webhook correlation key: unique so a gateway
-- order maps to at most one row. Postgres allows multiple NULLs, so historical
-- and not-yet-paid rows are unaffected.
CREATE UNIQUE INDEX "appointments_razorpay_order_id_idx"
  ON "appointments" ("razorpay_order_id");
--> statement-breakpoint

CREATE UNIQUE INDEX "medication_orders_razorpay_order_id_idx"
  ON "medication_orders" ("razorpay_order_id");
