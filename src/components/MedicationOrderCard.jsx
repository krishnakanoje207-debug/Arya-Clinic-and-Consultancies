"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import {
  getMedicationStatusAction,
  startMedicationPaymentAction,
} from "@/app/actions/medication";
import { openRazorpayCheckout } from "@/lib/razorpay-checkout";

/**
 * Patient-facing pay flow for a single pending_payment medication order (mirrors
 * BookingFlow's payment step). The patient picks one doctor-enabled duration,
 * confirms the shipping address (prefilled from their saved address), then pays
 * that option's price through Razorpay Checkout. The server prices the order and
 * opens the Razorpay order; the webhook marks it paid. On success we poll the
 * order status, then router.refresh() so the server re-renders the paid state.
 *
 * @param {object} props
 * @param {string} props.dashboardToken
 * @param {{ id:number, title:string, options:{days:number, amountInr:number}[] }} props.order
 * @param {string} props.prefillAddress
 */
export default function MedicationOrderCard({
  dashboardToken,
  order,
  prefillAddress,
}) {
  const t = useTranslations();
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [busy, setBusy] = useState(false);
  const [chosenDays, setChosenDays] = useState(null);
  const [address, setAddress] = useState(prefillAddress || "");
  const [error, setError] = useState(null);

  const options = Array.isArray(order.options) ? order.options : [];
  const chosen = options.find((o) => Number(o.days) === chosenDays) || null;

  function durationLabel(days) {
    const key = `medication.durations.${days}`;
    return t.has(key) ? t(key) : t("medication.supplyDays", { days });
  }

  // Poll the webhook-driven paid state, then refresh the server component.
  function pollUntilPaid() {
    let tries = 0;
    const iv = setInterval(async () => {
      tries += 1;
      const res = await getMedicationStatusAction(dashboardToken, order.id);
      if (res.ok && res.paid) {
        clearInterval(iv);
        router.refresh();
      } else if (tries >= 15) {
        clearInterval(iv);
        router.refresh();
      }
    }, 2000);
  }

  function pay(e) {
    e.preventDefault();
    setError(null);
    if (!chosen) {
      setError(t("medication.chooseDuration"));
      return;
    }
    startTransition(async () => {
      const res = await startMedicationPaymentAction(dashboardToken, {
        orderId: order.id,
        durationDays: chosenDays,
        address,
      });
      if (!res.ok) {
        const key = `medication.errors.${res.reason}`;
        const msg = t.has(key) ? t(key) : t("medication.errors.generic");
        setError(msg);
        return;
      }
      const p = res.payment;
      setBusy(true);
      openRazorpayCheckout({
        keyId: p.keyId,
        orderId: p.orderId,
        amountInr: p.amountInr,
        name: p.payeeName,
        description: t("medication.payTitle"),
        prefill: p.prefill,
        onSuccess: () => {
          pollUntilPaid();
        },
        onDismiss: () => setBusy(false),
        onFailed: () => {
          setBusy(false);
          setError(t("booking.payFailed"));
        },
      }).catch(() => {
        setBusy(false);
        setError(t("booking.payInitFailed"));
      });
    });
  }

  return (
    <div className="space-y-4 border-t border-[var(--border)] pt-4">
      {/* Duration picker */}
      <div>
        <span className="block text-sm font-semibold text-ink mb-2">
          {t("medication.chooseDuration")}
        </span>
        <div className="flex flex-wrap gap-2">
          {options.map((o) => (
            <button
              key={o.days}
              type="button"
              onClick={() => setChosenDays(Number(o.days))}
              className={`px-4 py-2 rounded-full border text-sm ${
                chosenDays === Number(o.days)
                  ? "bg-sage text-white border-sage"
                  : "border-[var(--border)] text-ink-soft"
              }`}
            >
              {durationLabel(o.days)} · ₹{o.amountInr}
            </button>
          ))}
        </div>
      </div>

      {chosen && (
        <form onSubmit={pay} className="space-y-4">
          <div>
            <label className="block text-sm font-semibold text-ink mb-2">
              {t("medication.addressLabel")}
            </label>
            <textarea
              required
              rows={3}
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder={t("medication.addressPlaceholder")}
              className="w-full rounded-lg border border-[var(--border)] px-3 py-2"
            />
          </div>

          <div className="space-y-3 border-t border-[var(--border)] pt-4">
            <h3 className="font-display text-lg text-sage-deep font-semibold">
              {t("medication.payTitle")}
            </h3>
            <p className="text-sm text-ink-soft">
              {t("medication.payInstructions")}
            </p>
            <p className="text-lg font-semibold text-terracotta">
              ₹{chosen.amountInr}
            </p>

            {error && <p className="text-sm text-terracotta-deep">{error}</p>}
            <button
              type="submit"
              disabled={pending || busy}
              className="btn-primary w-full"
            >
              {pending || busy ? t("common.loading") : t("medication.payCta")}
            </button>
            <p className="text-xs text-ink-soft">{t("booking.paySecure")}</p>
          </div>
        </form>
      )}
    </div>
  );
}
