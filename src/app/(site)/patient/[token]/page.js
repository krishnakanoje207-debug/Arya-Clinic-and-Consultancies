import { notFound } from "next/navigation";
import Link from "next/link";
import { getLocale, getTranslations } from "next-intl/server";
import { desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { appointments, patients, services } from "@/db/schema";
import { formatIst, nowUtc } from "@/lib/time";
import { tokenSchema } from "@/lib/validation";
import { listOrdersForPatient } from "@/lib/medications";
import { canJoin, joinWindow } from "@/lib/meeting";
import { reviewExistsForPatient } from "@/lib/reviews";
import MedicationOrderCard from "@/components/MedicationOrderCard";
import ReviewForm from "@/components/ReviewForm";
import IntakeForm from "@/components/IntakeForm";

export const dynamic = "force-dynamic";

export async function generateMetadata() {
  const t = await getTranslations("patientDashboard");
  return { title: t("title"), robots: { index: false, follow: false } };
}

const STATUS_STYLE = {
  pending_payment: "bg-gold-soft text-ink",
  confirmed: "bg-sage-soft text-sage-deep",
  completed: "bg-sage-soft text-sage-deep",
  cancelled: "bg-terracotta text-white",
  expired: "bg-cream-deep text-ink-soft",
};

const MED_STATUS_STYLE = {
  pending_payment: "bg-gold-soft text-ink",
  paid: "bg-sage-soft text-sage-deep",
  shipped: "bg-sage-soft text-sage-deep",
  cancelled: "bg-terracotta text-white",
};

/* Bucket by TIME ALONE, never by status.
   Two ways this list used to hide an appointment the patient had paid for:
   splitting on startAt moved the card — and its Join button — into "Past"
   the moment the consult began; and filtering on status filed a still-future
   appointment that had expired or been cancelled under "Past appointments",
   where nobody looks for a session that has not happened yet. Either way the
   patient sees an empty "Upcoming", concludes the booking vanished, and pays
   for the same slot twice. Anything not yet over now stays under Upcoming and
   shows its real status on the chip. The cutoff comes from joinWindow() so
   this split and the Join gate can never drift apart. */
function isUpcoming(a, now) {
  return joinWindow(a, now).closesAt >= now;
}

export default async function PatientDashboard({ params }) {
  const { token } = await params;
  const parsed = tokenSchema.safeParse(token);
  if (!parsed.success) notFound();

  const t = await getTranslations();
  const locale = await getLocale();

  let patient = null;
  try {
    [patient] = await db
      .select()
      .from(patients)
      .where(eq(patients.dashboardToken, parsed.data));
  } catch {
    notFound();
  }
  if (!patient) notFound();

  const rows = await db
    .select({
      appt: appointments,
      serviceTitle: services.title,
      serviceTitleHi: services.titleHi,
    })
    .from(appointments)
    .leftJoin(services, eq(appointments.serviceId, services.id))
    .where(eq(appointments.patientId, patient.id))
    .orderBy(desc(appointments.startAt));

  const now = nowUtc();
  const upcoming = rows.filter((r) => isUpcoming(r.appt, now)).reverse();
  const past = rows.filter((r) => !isUpcoming(r.appt, now));

  const serviceTitle = (r) =>
    (locale === "hi" && r.serviceTitleHi) || r.serviceTitle || "";

  // Medication orders. Payment runs through Razorpay Checkout in the client
  // card (opened against a server-created order); nothing payment-related is
  // pre-rendered here.
  const medOrders = await listOrdersForPatient(patient.id);
  const medCards = medOrders.map((o) => ({
    order: o,
    payable: o.status === "pending_payment",
  }));

  const durationLabel = (days) => {
    const key = `medication.durations.${days}`;
    return t.has(key) ? t(key) : t("medication.supplyDays", { days });
  };

  const alreadyReviewed = await reviewExistsForPatient(patient.id);

  return (
    <div className="mx-auto max-w-3xl px-4 py-12">
      <h1 className="font-display text-3xl text-sage-deep font-semibold mb-2">
        {t("patientDashboard.greeting", { name: patient.name })}
      </h1>
      <p className="text-ink-soft mb-8">{t("patientDashboard.title")}</p>

      <section className="mb-10">
        <h2 className="font-display text-xl text-sage-deep font-semibold mb-4">
          {t("patientDashboard.upcomingHeading")}
        </h2>
        {upcoming.length ? (
          <div className="space-y-4">
            {upcoming.map(({ appt: a, ...r }) => (
              <div key={a.id} className="card-warm p-5 space-y-2">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold text-ink">{serviceTitle(r)}</p>
                    <p className="text-sm text-ink-soft">
                      {formatIst(a.startAt, "dd LLL yyyy")} ·{" "}
                      {formatIst(a.startAt, "hh:mm a")} –{" "}
                      {formatIst(a.endAt, "hh:mm a")} IST
                    </p>
                    <p className="text-sm text-ink-soft">
                      {t(
                        a.mode === "online"
                          ? "booking.modeOnline"
                          : "booking.modeClinic",
                      )}
                    </p>
                  </div>
                  <span
                    className={`shrink-0 text-xs px-2 py-1 rounded-full ${STATUS_STYLE[a.status]}`}
                  >
                    {t(`patientDashboard.status.${a.status}`)}
                  </span>
                </div>
                {a.problemNote && (
                  <p className="text-sm text-ink">
                    <span className="text-ink-soft">
                      {t("patientDashboard.yourNote")}
                    </span>{" "}
                    {a.problemNote}
                  </p>
                )}
                <div className="flex flex-wrap gap-3 pt-1">
                  {/* A Meet URL never expires, so the button is live only
                      inside the appointment's join window; before it we show
                      the opening time instead. */}
                  {a.status === "confirmed" &&
                    a.meetingLink &&
                    (canJoin(a, now) ? (
                      <a href={a.meetingLink} className="btn-primary text-sm">
                        {t("patientDashboard.join")}
                      </a>
                    ) : !joinWindow(a, now).hasClosed ? (
                      <p className="text-sm text-ink-soft self-center">
                        {t("patientDashboard.joinOpensAt", {
                          time: formatIst(joinWindow(a, now).opensAt, "hh:mm a"),
                        })}
                      </p>
                    ) : null)}
                  <Link
                    href={`/manage/${a.manageToken}`}
                    className="btn-ghost text-sm"
                  >
                    {t("patientDashboard.manage")}
                  </Link>
                </div>
                {a.status === "confirmed" && !a.intakeAnswers && (
                  <IntakeForm manageToken={a.manageToken} />
                )}
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-ink-soft">
            {t("patientDashboard.noUpcoming")}
          </p>
        )}
        <div className="mt-4 card-warm p-5 flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-ink-soft">
            {t("patientDashboard.followUpHint")}
          </p>
          <Link
            href={`/book?p=${patient.dashboardToken}`}
            className="btn-primary inline-block"
          >
            {t("patientDashboard.bookFollowUp")}
          </Link>
        </div>
      </section>

      <section className="mb-10">
        <h2 className="font-display text-xl text-sage-deep font-semibold mb-4">
          {t("patientDashboard.pastHeading")}
        </h2>
        {past.length ? (
          <div className="card-warm divide-y divide-[var(--border)]">
            {past.map(({ appt: a, ...r }) => (
              <div
                key={a.id}
                className="flex items-center justify-between gap-3 p-4 text-sm"
              >
                <div>
                  <p className="text-ink">{serviceTitle(r)}</p>
                  <p className="text-ink-soft">
                    {formatIst(a.startAt, "dd LLL yyyy")} IST
                  </p>
                </div>
                <span
                  className={`shrink-0 text-xs px-2 py-1 rounded-full ${STATUS_STYLE[a.status]}`}
                >
                  {t(`patientDashboard.status.${a.status}`)}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-ink-soft">{t("patientDashboard.noPast")}</p>
        )}
      </section>

      <section className="mb-10">
        <h2 className="font-display text-xl text-sage-deep font-semibold mb-4">
          {t("medication.title")}
        </h2>
        {medCards.length ? (
          <div className="space-y-4">
            {medCards.map(({ order: o, payable }) => (
              <div key={o.id} className="card-warm p-5 space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold text-ink">{o.title}</p>
                    {o.chosenDurationDays && o.amountInr != null && (
                      <p className="text-sm text-ink-soft">
                        {durationLabel(o.chosenDurationDays)} · ₹{o.amountInr}
                      </p>
                    )}
                  </div>
                  <span
                    className={`shrink-0 text-xs px-2 py-1 rounded-full ${MED_STATUS_STYLE[o.status]}`}
                  >
                    {t(`medication.status.${o.status}`)}
                  </span>
                </div>

                {payable && (
                  <MedicationOrderCard
                    dashboardToken={patient.dashboardToken}
                    order={{ id: o.id, title: o.title, options: o.options }}
                    prefillAddress={patient.address || ""}
                  />
                )}

                {o.status === "paid" && (
                  <p className="text-sm text-sage-deep">
                    {t("medication.preparing")}
                  </p>
                )}

                {o.status === "shipped" && (
                  <p className="text-sm text-ink-soft">
                    {t("medication.shippedLabel")}
                    {o.courierRef && (
                      <span className="block">
                        {t("medication.courierRef")}: {o.courierRef}
                      </span>
                    )}
                  </p>
                )}
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-ink-soft">{t("medication.empty")}</p>
        )}
      </section>

      <section className="mb-10">
        <h2 className="font-display text-xl text-sage-deep font-semibold mb-4">
          {t("review.heading")}
        </h2>
        <ReviewForm
          token={patient.dashboardToken}
          defaultName={patient.name}
          alreadySubmitted={alreadyReviewed}
        />
      </section>

      <p className="mt-8 text-xs text-ink-soft">
        {t("patientDashboard.privateNote")}
      </p>
    </div>
  );
}
