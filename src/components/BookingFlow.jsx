"use client";

import Image from "next/image";
import { useEffect, useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import {
  createBookingAction,
  getCalendarAction,
  submitIntakeAction,
  submitUtrAction,
} from "@/app/actions/booking";
import { rescheduleByToken } from "@/app/actions/manage";

function formatDayLabel(dateStr) {
  const d = new Date(`${dateStr}T00:00:00`);
  return d.toLocaleDateString(undefined, {
    weekday: "short",
    day: "numeric",
    month: "short",
  });
}

export default function BookingFlow({
  services,
  clinicMode,
  preselectServiceId,
  reschedule = null,
}) {
  const t = useTranslations();
  const [pending, startTransition] = useTransition();

  // Normal flow: select → details → payment → pending.
  // Reschedule flow (valid manage token): select → done (same row moves;
  // no new details or payment are ever collected).
  const [step, setStep] = useState("select");
  const [serviceId, setServiceId] = useState(preselectServiceId || services[0]?.id || null);
  const [mode, setMode] = useState("online");
  const [calendar, setCalendar] = useState(null);
  const [activeDate, setActiveDate] = useState(null);
  const [slot, setSlot] = useState(null);
  const [patient, setPatient] = useState({ name: "", phone: "", email: "" });
  const [booking, setBooking] = useState(null);
  const [upi, setUpi] = useState(null);
  const [utr, setUtr] = useState("");
  const [error, setError] = useState(null);
  const [copied, setCopied] = useState(false);

  const service = services.find((s) => s.id === Number(serviceId)) || null;
  const needsModeChoice = !reschedule && clinicMode && service?.mode === "both";
  const effectiveMode = reschedule
    ? reschedule.mode
    : needsModeChoice
      ? mode
      : service?.mode === "clinic"
        ? "clinic"
        : "online";

  // Load the live calendar whenever service or mode changes. All state
  // writes happen inside the async transition (not the effect body).
  useEffect(() => {
    if (!serviceId) return;
    startTransition(async () => {
      setSlot(null);
      setActiveDate(null);
      const cal = await getCalendarAction(serviceId, effectiveMode);
      setCalendar(cal);
      const firstDayWithSlots = cal.days.find((d) =>
        d.slots.some((s) => s.available),
      );
      setActiveDate(firstDayWithSlots?.date || cal.days[0]?.date || null);
    });
  }, [serviceId, effectiveMode]);

  function proceedToDetails() {
    setError(null);
    if (!slot) {
      setError(t("booking.pickSlot"));
      return;
    }
    if (reschedule) {
      startTransition(async () => {
        const res = await rescheduleByToken(reschedule.token, slot.startAt);
        if (!res.ok) {
          setError(
            res.reason === "slot_taken"
              ? t("booking.slotTaken")
              : t("booking.rescheduleFailed"),
          );
          setSlot(null);
          return;
        }
        setStep("rescheduled");
      });
      return;
    }
    setStep("details");
  }

  function submitBooking(e) {
    e.preventDefault();
    setError(null);
    if (!patient.name || !patient.phone) {
      setError(t("common.required"));
      return;
    }
    startTransition(async () => {
      const res = await createBookingAction({
        serviceId,
        mode: effectiveMode,
        startAtIso: slot.startAt,
        patient,
      });
      if (!res.ok) {
        const msg =
          res.reason === "slot_taken"
            ? t("booking.slotTaken")
            : res.reason === "too_many_holds"
              ? t("booking.tooManyHolds")
              : t("common.required");
        setError(msg);
        if (res.reason === "slot_taken") setStep("select");
        return;
      }
      setBooking(res.booking);
      setUpi(res.upi);
      setStep("payment");
    });
  }

  function submitPayment(e) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const res = await submitUtrAction(booking.manageToken, utr);
      if (!res.ok) {
        setError(t("booking.utrLabel"));
        return;
      }
      setStep("pending");
    });
  }

  function copyUpi() {
    navigator.clipboard?.writeText(upi.upiId).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  }

  const activeDay = calendar?.days?.find((d) => d.date === activeDate) || null;

  return (
    <div>
      <h1 className="font-display text-3xl text-sage-deep font-semibold mb-6">
        {reschedule ? t("booking.rescheduleTitle") : t("booking.title")}
      </h1>

      {step === "rescheduled" && (
        <div className="card-warm p-6">
          <p className="font-semibold text-sage-deep">
            ✓ {t("booking.rescheduleDone")}
          </p>
        </div>
      )}

      {(step === "select" || step === "details") && (
        <div className="card-warm p-6 space-y-6">
          {/* Service (locked during reschedule — same appointment moves) */}
          <div>
            <label className="block text-sm font-semibold text-ink mb-2">
              {t("booking.chooseService")}
            </label>
            <select
              value={serviceId || ""}
              onChange={(e) => setServiceId(Number(e.target.value))}
              disabled={step === "details" || Boolean(reschedule)}
              className="w-full rounded-lg border border-[var(--border)] px-3 py-2"
            >
              {services.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.title} — ₹{s.feeInr} · {s.durationMinutes}
                  {t("services.minutes")}
                </option>
              ))}
            </select>
          </div>

          {needsModeChoice && (
            <div>
              <span className="block text-sm font-semibold text-ink mb-2">
                {t("booking.chooseMode")}
              </span>
              <div className="flex gap-3">
                {["online", "clinic"].map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => setMode(m)}
                    disabled={step === "details"}
                    className={`px-4 py-2 rounded-full border text-sm ${
                      effectiveMode === m
                        ? "bg-sage text-white border-sage"
                        : "border-[var(--border)] text-ink-soft"
                    }`}
                  >
                    {t(m === "online" ? "booking.modeOnline" : "booking.modeClinic")}
                  </button>
                ))}
              </div>
            </div>
          )}

          {step === "select" && (
            <>
              {/* Dates */}
              <div>
                <span className="block text-sm font-semibold text-ink mb-2">
                  {t("booking.pickDate")}
                </span>
                {pending && !calendar ? (
                  <p className="text-sm text-ink-soft">{t("common.loading")}</p>
                ) : (
                  <div className="flex gap-2 overflow-x-auto pb-2">
                    {calendar?.days
                      ?.filter((d) => d.slots.length)
                      .map((d) => {
                        const has = d.slots.some((s) => s.available);
                        return (
                          <button
                            key={d.date}
                            type="button"
                            onClick={() => {
                              setActiveDate(d.date);
                              setSlot(null);
                            }}
                            disabled={!has}
                            className={`shrink-0 px-3 py-2 rounded-lg border text-xs ${
                              activeDate === d.date
                                ? "bg-sage text-white border-sage"
                                : has
                                  ? "border-[var(--border)] text-ink"
                                  : "border-[var(--border)] text-ink-soft/40 line-through"
                            }`}
                          >
                            {formatDayLabel(d.date)}
                          </button>
                        );
                      })}
                  </div>
                )}
              </div>

              {/* Slots */}
              <div>
                <span className="block text-sm font-semibold text-ink mb-2">
                  {t("booking.pickSlot")}
                </span>
                {activeDay && activeDay.slots.length ? (
                  <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                    {activeDay.slots.map((s) => (
                      <button
                        key={s.startAt}
                        type="button"
                        disabled={!s.available}
                        onClick={() => setSlot(s)}
                        title={s.available ? "" : t("booking.unavailable")}
                        className={`px-2 py-2 rounded-lg border text-sm ${
                          slot?.startAt === s.startAt
                            ? "bg-terracotta text-white border-terracotta"
                            : s.available
                              ? "border-[var(--border)] text-ink hover:border-sage"
                              : "border-[var(--border)] text-ink-soft/40 line-through cursor-not-allowed"
                        }`}
                      >
                        {s.label}
                      </button>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-ink-soft">{t("booking.noSlots")}</p>
                )}
              </div>

              {error && <p className="text-sm text-terracotta-deep">{error}</p>}
              <button
                type="button"
                onClick={proceedToDetails}
                disabled={!slot || pending}
                className="btn-primary"
              >
                {pending
                  ? t("common.loading")
                  : reschedule
                    ? t("booking.confirmNewTime")
                    : t("booking.continue")}
              </button>
            </>
          )}

          {step === "details" && (
            <form onSubmit={submitBooking} className="space-y-3">
              <p className="text-sm text-ink-soft">
                {formatDayLabel(activeDate)} · {slot?.label} ·{" "}
                {t(effectiveMode === "online" ? "booking.modeOnline" : "booking.modeClinic")}
              </p>
              <input
                required
                placeholder={t("booking.name")}
                value={patient.name}
                onChange={(e) => setPatient({ ...patient, name: e.target.value })}
                className="w-full rounded-lg border border-[var(--border)] px-3 py-2"
              />
              <input
                required
                placeholder={t("booking.phone")}
                value={patient.phone}
                onChange={(e) => setPatient({ ...patient, phone: e.target.value })}
                className="w-full rounded-lg border border-[var(--border)] px-3 py-2"
              />
              <input
                type="email"
                placeholder={t("booking.email")}
                value={patient.email}
                onChange={(e) => setPatient({ ...patient, email: e.target.value })}
                className="w-full rounded-lg border border-[var(--border)] px-3 py-2"
              />
              <p className="text-xs text-ink-soft">{t("booking.holdNote")}</p>
              {error && <p className="text-sm text-terracotta-deep">{error}</p>}
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setStep("select")}
                  className="btn-ghost"
                >
                  ←
                </button>
                <button type="submit" disabled={pending} className="btn-primary flex-1">
                  {pending ? t("common.loading") : t("booking.continue")}
                </button>
              </div>
            </form>
          )}
        </div>
      )}

      {step === "payment" && (
        <PaymentWindow
          t={t}
          upi={upi}
          amount={booking.amountInr}
          utr={utr}
          setUtr={setUtr}
          onSubmit={submitPayment}
          pending={pending}
          error={error}
          copied={copied}
          copyUpi={copyUpi}
        />
      )}

      {step === "pending" && (
        <PendingWithIntake t={t} manageToken={booking.manageToken} />
      )}
    </div>
  );
}

function PaymentWindow({ t, upi, amount, utr, setUtr, onSubmit, pending, error, copied, copyUpi }) {
  const isMobile =
    typeof navigator !== "undefined" && /Android|iPhone/i.test(navigator.userAgent);
  return (
    <div className="card-warm p-6 space-y-5">
      <div>
        <h2 className="font-display text-2xl text-sage-deep font-semibold">
          {t("booking.payTitle")}
        </h2>
        <p className="text-sm text-ink-soft mt-1">{t("booking.payInstructions")}</p>
      </div>

      <p className="text-lg font-semibold text-terracotta">₹{amount}</p>

      {upi.deepLink && isMobile && (
        <a href={upi.deepLink} className="btn-primary inline-block">
          {t("booking.payViaApp")}
        </a>
      )}

      {upi.qrDataUrl && (
        <div>
          <p className="text-sm text-ink-soft mb-2">{t("booking.scanQr")}</p>
          <Image
            src={upi.qrDataUrl}
            alt="UPI QR"
            width={200}
            height={200}
            unoptimized
            className="rounded-lg border border-[var(--border)]"
          />
        </div>
      )}

      {upi.upiId && (
        <div className="flex items-center gap-2 text-sm">
          <code className="bg-cream-deep px-2 py-1 rounded">{upi.upiId}</code>
          <button type="button" onClick={copyUpi} className="btn-ghost text-xs py-1 px-3">
            {copied ? t("booking.copied") : t("booking.copyUpi")}
          </button>
        </div>
      )}

      <form onSubmit={onSubmit} className="space-y-3 border-t border-[var(--border)] pt-4">
        <label className="block text-sm font-semibold text-ink">
          {t("booking.utrLabel")}
        </label>
        <input
          required
          value={utr}
          onChange={(e) => setUtr(e.target.value)}
          className="w-full rounded-lg border border-[var(--border)] px-3 py-2"
        />
        {error && <p className="text-sm text-terracotta-deep">{error}</p>}
        <button type="submit" disabled={pending} className="btn-primary w-full">
          {pending ? t("common.loading") : t("booking.submitUtr")}
        </button>
      </form>
    </div>
  );
}

function PendingWithIntake({ t, manageToken }) {
  const [done, setDone] = useState(false);
  const [saved, setSaved] = useState(false);
  const [pending, startTransition] = useTransition();
  const [answers, setAnswers] = useState({});

  const fields = [
    "chiefComplaint",
    "duration",
    "better",
    "worse",
    "history",
    "medications",
    "lifestyle",
  ];

  function save(e) {
    e.preventDefault();
    startTransition(async () => {
      await submitIntakeAction(manageToken, answers);
      setSaved(true);
      setDone(true);
    });
  }

  return (
    <div className="card-warm p-6 space-y-5">
      <div>
        <h2 className="font-display text-2xl text-sage-deep font-semibold">
          {t("booking.pendingTitle")}
        </h2>
        <p className="text-sm text-ink-soft mt-1">{t("booking.pendingBody")}</p>
      </div>

      {!done ? (
        <form onSubmit={save} className="space-y-3 border-t border-[var(--border)] pt-4">
          <h3 className="font-semibold text-ink">{t("booking.intakeTitle")}</h3>
          <p className="text-sm text-ink-soft">{t("booking.intakeBody")}</p>
          {fields.map((f) => (
            <div key={f}>
              <label className="block text-sm text-ink mb-1">
                {t(`intake.${f}`)}
              </label>
              <textarea
                rows={2}
                value={answers[f] || ""}
                onChange={(e) => setAnswers({ ...answers, [f]: e.target.value })}
                className="w-full rounded-lg border border-[var(--border)] px-3 py-2 text-sm"
              />
            </div>
          ))}
          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => setDone(true)}
              className="btn-ghost"
            >
              {t("booking.skip")}
            </button>
            <button type="submit" disabled={pending} className="btn-primary flex-1">
              {pending ? t("common.loading") : t("booking.intakeSubmit")}
            </button>
          </div>
        </form>
      ) : (
        <p className="text-sm text-sage-deep border-t border-[var(--border)] pt-4">
          {saved ? "✓ " : ""}
          {t("booking.pendingBody")}
        </p>
      )}
    </div>
  );
}
