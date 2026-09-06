"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import {
  createBookingAction,
  getBookingStatusAction,
  getCalendarAction,
  submitIntakeAction,
} from "@/app/actions/booking";
import { rescheduleByToken } from "@/app/actions/manage";
import { openRazorpayCheckout } from "@/lib/razorpay-checkout";

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
  prefill = null,
  patientToken = null,
}) {
  const t = useTranslations();
  const [pending, startTransition] = useTransition();

  // Normal flow: select (details form appears inline once a slot is
  // picked) → payment → pending.
  // Reschedule flow (valid manage token): select → done (same row moves;
  // no new details or payment are ever collected).
  const [step, setStep] = useState("select");
  const [serviceId, setServiceId] = useState(preselectServiceId || services[0]?.id || null);
  const [mode, setMode] = useState("online");
  const [calendar, setCalendar] = useState(null);
  const [activeDate, setActiveDate] = useState(null);
  const [slot, setSlot] = useState(null);
  const [patient, setPatient] = useState({
    name: prefill?.name || "",
    phone: prefill?.phone || "",
    email: prefill?.email || "",
    note: "",
  });
  const detailsRef = useRef(null);

  /* Switching who the consult is for swaps the name field, so one person's
     name is never submitted as the other's. The name typed for yourself is
     parked rather than discarded — switching away and back should not make
     you retype it. */
  const [selfName, setSelfName] = useState(prefill?.name || "");
  function chooseBookingFor(next) {
    if (next === bookingFor) return;
    if (next === "other") {
      setSelfName(patient.name);
      setPatient({ ...patient, name: "" });
    } else {
      setPatient({ ...patient, name: selfName });
    }
    setBookingFor(next);
  }
  // The name field is always the PATIENT's name; the phone stays the
  // booker's contact. Patient identity is (phone + name), so booking for
  // someone else on your own number gives them their own record and their
  // own dashboard link instead of merging into yours.
  const [bookingFor, setBookingFor] = useState("self");
  const [booking, setBooking] = useState(null);
  const [payment, setPayment] = useState(null);
  const [error, setError] = useState(null);

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

  // Reschedule: the slot picker's button moves the existing appointment.
  function confirmReschedule() {
    setError(null);
    if (!slot) {
      setError(t("booking.pickSlot"));
      return;
    }
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
  }

  // Bring the inline details form into view as soon as a slot is picked.
  useEffect(() => {
    if (slot && !reschedule) {
      detailsRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }
  }, [slot, reschedule]);

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
        // Only when the consult is for this patient themselves — booking for
        // someone else must create that person's own record, not reuse this one.
        patientToken: bookingFor === "self" ? patientToken : null,
      });
      if (!res.ok) {
        const msg =
          res.reason === "slot_taken"
            ? t("booking.slotTaken")
            : res.reason === "too_many_holds"
              ? t("booking.tooManyHolds")
              : res.reason === "payment_init_failed"
                ? t("booking.payInitFailed")
                : t("common.required");
        setError(msg);
        if (res.reason === "slot_taken") setSlot(null);
        return;
      }
      setBooking(res.booking);
      setPayment(res.payment);
      setStep("payment");
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

      {step === "select" && (
        <div className="card-warm p-6 space-y-6">
          {/* Service (locked during reschedule — same appointment moves) */}
          <div>
            <label className="block text-sm font-semibold text-ink mb-2">
              {t("booking.chooseService")}
            </label>
            <select
              value={serviceId || ""}
              onChange={(e) => setServiceId(Number(e.target.value))}
              disabled={Boolean(reschedule)}
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
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {activeDay.slots.map((s) => (
                      <button
                        key={s.startAt}
                        type="button"
                        disabled={!s.available}
                        onClick={() => setSlot(s)}
                        title={
                          s.available
                            ? ""
                            : s.taken
                              ? t("booking.booked")
                              : t("booking.unavailable")
                        }
                        className={`px-2 py-2 rounded-lg border text-sm ${
                          slot?.startAt === s.startAt
                            ? "bg-terracotta text-white border-terracotta"
                            : s.available
                              ? "border-[var(--border)] text-ink hover:border-sage"
                              : s.taken
                                ? "border-[var(--border)] bg-cream-deep text-ink-soft/60 cursor-not-allowed"
                                : "border-[var(--border)] text-ink-soft/40 line-through cursor-not-allowed"
                        }`}
                      >
                        {s.taken ? t("booking.booked") : s.label}
                      </button>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-ink-soft">{t("booking.noSlots")}</p>
                )}
              </div>

              {reschedule ? (
                <>
                  {error && (
                    <p className="text-sm text-terracotta-deep">{error}</p>
                  )}
                  <button
                    type="button"
                    onClick={confirmReschedule}
                    disabled={!slot || pending}
                    className="btn-primary"
                  >
                    {pending ? t("common.loading") : t("booking.confirmNewTime")}
                  </button>
                </>
              ) : slot ? (
                /* Details form appears automatically once a slot is picked;
                   the slot grid stays visible so the choice can change. */
                <form
                  ref={detailsRef}
                  onSubmit={submitBooking}
                  className="space-y-3 border-t border-[var(--border)] pt-4 scroll-mt-24"
                >
                  <p className="font-semibold text-ink">
                    {t("booking.yourDetails")}
                  </p>
                  <p className="text-sm text-ink-soft">
                    {formatDayLabel(activeDate)} · {slot?.label} ·{" "}
                    {t(
                      effectiveMode === "online"
                        ? "booking.modeOnline"
                        : "booking.modeClinic",
                    )}
                  </p>
                  <fieldset>
                    <legend className="text-sm text-ink mb-2">
                      {t("booking.forWhom")}
                    </legend>
                    <div className="flex flex-wrap gap-4">
                      {["self", "other"].map((v) => (
                        <label
                          key={v}
                          className="flex items-center gap-2 text-sm text-ink"
                        >
                          <input
                            type="radio"
                            name="bookingFor"
                            value={v}
                            checked={bookingFor === v}
                            onChange={() => chooseBookingFor(v)}
                          />
                          {t(v === "self" ? "booking.forSelf" : "booking.forOther")}
                        </label>
                      ))}
                    </div>
                  </fieldset>
                  <input
                    required
                    placeholder={t(
                      bookingFor === "other" ? "booking.patientName" : "booking.name",
                    )}
                    value={patient.name}
                    onChange={(e) =>
                      setPatient({ ...patient, name: e.target.value })
                    }
                    className="w-full rounded-lg border border-[var(--border)] px-3 py-2"
                  />
                  <input
                    required
                    placeholder={t("booking.phone")}
                    value={patient.phone}
                    onChange={(e) =>
                      setPatient({ ...patient, phone: e.target.value })
                    }
                    className="w-full rounded-lg border border-[var(--border)] px-3 py-2"
                  />
                  {bookingFor === "other" && (
                    <p className="text-xs text-ink-soft">
                      {t("booking.otherHint")}
                    </p>
                  )}
                  <textarea
                    required
                    rows={3}
                    placeholder={t("booking.problem")}
                    value={patient.note}
                    onChange={(e) =>
                      setPatient({ ...patient, note: e.target.value })
                    }
                    className="w-full rounded-lg border border-[var(--border)] px-3 py-2"
                  />
                  <input
                    type="email"
                    placeholder={t("booking.email")}
                    value={patient.email}
                    onChange={(e) =>
                      setPatient({ ...patient, email: e.target.value })
                    }
                    className="w-full rounded-lg border border-[var(--border)] px-3 py-2"
                  />
                  <p className="text-xs text-ink-soft">{t("booking.holdNote")}</p>
                  {error && (
                    <p className="text-sm text-terracotta-deep">{error}</p>
                  )}
                  <button
                    type="submit"
                    disabled={pending}
                    className="btn-primary w-full"
                  >
                    {pending ? t("common.loading") : t("booking.continue")}
                  </button>
                </form>
              ) : null}
            </>
          )}

        </div>
      )}

      {step === "payment" && (
        <PaymentWindow
          t={t}
          payment={payment}
          onPaid={() => setStep("pending")}
        />
      )}

      {step === "pending" && (
        <PendingWithIntake
          t={t}
          manageToken={booking.manageToken}
          dashboardToken={booking.dashboardToken}
        />
      )}
    </div>
  );
}

function PaymentWindow({ t, payment, onPaid }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  function pay() {
    setError(null);
    setBusy(true);
    openRazorpayCheckout({
      keyId: payment.keyId,
      orderId: payment.orderId,
      amountInr: payment.amountInr,
      name: payment.payeeName,
      description: t("booking.payTitle"),
      prefill: payment.prefill,
      onSuccess: () => {
        setBusy(false);
        onPaid();
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
  }

  return (
    <div className="card-warm p-6 space-y-5">
      <div>
        <h2 className="font-display text-2xl text-sage-deep font-semibold">
          {t("booking.payTitle")}
        </h2>
        <p className="text-sm text-ink-soft mt-1">{t("booking.payInstructions")}</p>
      </div>

      <p className="text-lg font-semibold text-terracotta">₹{payment.amountInr}</p>

      {error && <p className="text-sm text-terracotta-deep">{error}</p>}

      <button
        type="button"
        onClick={pay}
        disabled={busy}
        className="btn-primary w-full"
      >
        {busy ? t("common.loading") : t("booking.payNow")}
      </button>

      <p className="text-xs text-ink-soft">{t("booking.paySecure")}</p>
    </div>
  );
}

function PendingWithIntake({ t, manageToken, dashboardToken }) {
  const [done, setDone] = useState(false);
  const [saved, setSaved] = useState(false);
  const [pending, startTransition] = useTransition();
  const [answers, setAnswers] = useState({});
  // Poll the webhook-driven confirmation so the patient sees it flip to
  // "confirmed" without refreshing; after ~30s show a reassuring fallback.
  const [confirmState, setConfirmState] = useState("confirming");

  useEffect(() => {
    let tries = 0;
    let stopped = false;
    const iv = setInterval(async () => {
      tries += 1;
      const res = await getBookingStatusAction(manageToken);
      if (stopped) return;
      if (res.ok && res.confirmed) {
        setConfirmState("confirmed");
        clearInterval(iv);
      } else if (tries >= 15) {
        setConfirmState("timeout");
        clearInterval(iv);
      }
    }, 2000);
    return () => {
      stopped = true;
      clearInterval(iv);
    };
  }, [manageToken]);

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

  const heading =
    confirmState === "confirmed"
      ? t("booking.confirmedTitle")
      : confirmState === "timeout"
        ? t("booking.confirmingTitle")
        : t("booking.confirmingTitle");
  const bodyText =
    confirmState === "confirmed"
      ? t("booking.confirmedBody")
      : confirmState === "timeout"
        ? t("booking.confirmOnItsWay")
        : t("booking.confirmingBody");

  return (
    <div className="card-warm p-6 space-y-5">
      <div>
        <h2 className="font-display text-2xl text-sage-deep font-semibold">
          {confirmState === "confirmed" ? "✓ " : ""}
          {heading}
        </h2>
        <p className="text-sm text-ink-soft mt-1">{bodyText}</p>
      </div>

      {dashboardToken && (
        <a
          href={`/patient/${dashboardToken}`}
          className="btn-primary inline-block"
        >
          {t("booking.viewDashboard")}
        </a>
      )}

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
