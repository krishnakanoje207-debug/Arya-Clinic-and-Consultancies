"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { submitMedicationPaymentAction } from "@/app/actions/medication";

/**
 * Patient-facing pay flow for a single pending_payment medication order (mirrors
 * BookingFlow's payment step). The patient picks one doctor-enabled duration,
 * confirms the shipping address (prefilled from their saved address), scans the
 * UPI QR for that option's price and submits their UTR. The QR data URLs are
 * pre-rendered server-side per option (`qrByDays`) so no qrcode/db code lands in
 * the client bundle. On success we router.refresh() so the server re-renders the
 * awaiting-verification state.
 *
 * @param {object} props
 * @param {string} props.dashboardToken
 * @param {{ id:number, title:string, options:{days:number, amountInr:number}[] }} props.order
 * @param {string} props.prefillAddress
 * @param {string} props.upiId
 * @param {string} props.payeeName
 * @param {Record<string,string>} props.qrByDays  days → QR data URL
 */
export default function MedicationOrderCard({
  dashboardToken,
  order,
  prefillAddress,
  upiId,
  payeeName,
  qrByDays,
}) {
  const t = useTranslations();
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [chosenDays, setChosenDays] = useState(null);
  const [address, setAddress] = useState(prefillAddress || "");
  const [utr, setUtr] = useState("");
  const [error, setError] = useState(null);
  const [copied, setCopied] = useState(false);

  const options = Array.isArray(order.options) ? order.options : [];
  const chosen = options.find((o) => Number(o.days) === chosenDays) || null;

  const isMobile =
    typeof navigator !== "undefined" &&
    /Android|iPhone/i.test(navigator.userAgent);

  function durationLabel(days) {
    const key = `medication.durations.${days}`;
    return t.has(key) ? t(key) : t("medication.supplyDays", { days });
  }

  function deepLink(amountInr) {
    const params = new URLSearchParams({
      pa: upiId,
      pn: payeeName,
      am: String(amountInr),
      cu: "INR",
      tn: `Meds ${order.id}`,
    });
    return `upi://pay?${params.toString()}`;
  }

  function copyUpi() {
    navigator.clipboard?.writeText(upiId).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  }

  function submit(e) {
    e.preventDefault();
    setError(null);
    if (!chosen) {
      setError(t("medication.chooseDuration"));
      return;
    }
    startTransition(async () => {
      const res = await submitMedicationPaymentAction(dashboardToken, {
        orderId: order.id,
        durationDays: chosenDays,
        address,
        utr,
      });
      if (!res.ok) {
        const key = `medication.errors.${res.reason}`;
        const msg = t.has(key) ? t(key) : t("medication.errors.generic");
        setError(msg);
        return;
      }
      router.refresh();
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
        <form onSubmit={submit} className="space-y-4">
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

            {isMobile && upiId && (
              <a
                href={deepLink(chosen.amountInr)}
                className="btn-primary inline-block"
              >
                {t("booking.payViaApp")}
              </a>
            )}

            {qrByDays?.[String(chosen.days)] && (
              <div>
                <p className="text-sm text-ink-soft mb-2">
                  {t("booking.scanQr")}
                </p>
                <Image
                  src={qrByDays[String(chosen.days)]}
                  alt="UPI QR"
                  width={200}
                  height={200}
                  unoptimized
                  className="rounded-lg border border-[var(--border)]"
                />
              </div>
            )}

            {upiId && (
              <div className="flex items-center gap-2 text-sm">
                <code className="bg-cream-deep px-2 py-1 rounded">{upiId}</code>
                <button
                  type="button"
                  onClick={copyUpi}
                  className="btn-ghost text-xs py-1 px-3"
                >
                  {copied ? t("booking.copied") : t("booking.copyUpi")}
                </button>
              </div>
            )}

            <div>
              <label className="block text-sm font-semibold text-ink mb-1">
                {t("booking.utrLabel")}
              </label>
              <input
                required
                value={utr}
                onChange={(e) => setUtr(e.target.value)}
                className="w-full rounded-lg border border-[var(--border)] px-3 py-2"
              />
            </div>

            {error && <p className="text-sm text-terracotta-deep">{error}</p>}
            <button
              type="submit"
              disabled={pending}
              className="btn-primary w-full"
            >
              {pending ? t("common.loading") : t("medication.payCta")}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
