import { notFound } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { appointments, medicationOrders, patients, services } from "@/db/schema";
import { getProfile, localized } from "@/lib/content";
import { getSettings } from "@/lib/settings";
import { formatIst } from "@/lib/time";
import {
  consultationHasReceipt,
  medicineHasReceipt,
  receiptNumber,
  verifyReceipt,
} from "@/lib/receipts";
import PrintButton from "@/components/PrintButton";

/* Printable payment receipt. Lives outside the (site) group so it prints
   without the header, footer or the phone's sticky WhatsApp/Book bar. Opened
   by a signed link (see src/lib/receipts.js) that grants this one receipt and
   nothing else, so patients can forward it safely. */

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }) {
  const { kind } = await params;
  const t = await getTranslations("receipt");
  return {
    title: t(kind === "medicine" ? "medicineTitle" : "consultationTitle"),
    robots: { index: false, follow: false },
  };
}

async function loadConsultation(id) {
  const [row] = await db
    .select({ appt: appointments, service: services })
    .from(appointments)
    .leftJoin(services, eq(appointments.serviceId, services.id))
    .where(eq(appointments.id, id));
  if (!row || !consultationHasReceipt(row.appt)) return null;
  return row;
}

async function loadMedicine(id) {
  const [row] = await db
    .select({ order: medicationOrders, patient: patients })
    .from(medicationOrders)
    .innerJoin(patients, eq(medicationOrders.patientId, patients.id))
    .where(eq(medicationOrders.id, id));
  if (!row || !medicineHasReceipt(row.order)) return null;
  return row;
}

export default async function ReceiptPage({ params }) {
  const { kind, id, sig } = await params;
  if (!verifyReceipt(kind, id, sig)) notFound();
  const n = Number(id);

  const data = kind === "consultation" ? await loadConsultation(n) : await loadMedicine(n);
  if (!data) notFound();

  const [t, tAll, locale, profile, settings] = await Promise.all([
    getTranslations("receipt"),
    getTranslations(),
    getLocale(),
    getProfile(),
    getSettings(["brand_name", "clinic_address", "contact_email", "receipt_note"]),
  ]);

  const degrees = (Array.isArray(profile.degrees) ? profile.degrees : [])
    .map((d) => d?.title)
    .filter(Boolean)
    .join(", ");
  const reg = profile.registrationNumber
    ? `${t("regNo")} ${profile.registrationNumber}${
        profile.registrationCouncil ? ` (${profile.registrationCouncil})` : ""
      }`
    : null;

  const durationLabel = (days) => {
    const key = `medication.durations.${days}`;
    return tAll.has(key) ? tAll(key) : tAll("medication.supplyDays", { days });
  };

  // [label, value] rows, in print order.
  let title;
  let rows;
  let amount;
  let paymentId;
  if (kind === "consultation") {
    const { appt: a, service } = data;
    title = t("consultationTitle");
    amount = a.amountInr;
    paymentId = a.razorpayPaymentId;
    rows = [
      [t("number"), receiptNumber(kind, a.id)],
      [t("paymentDate"), formatIst(a.paidAt, "dd LLL yyyy")],
      [t("patient"), a.patientName],
      [t("service"), service ? localized(service, "title", locale) : "—"],
      [
        t("appointment"),
        `${formatIst(a.startAt, "dd LLL yyyy, hh:mm a")} IST`,
      ],
      [
        t("mode"),
        tAll(a.mode === "online" ? "booking.modeOnline" : "booking.modeClinic"),
      ],
    ];
  } else {
    const { order: o, patient } = data;
    title = t("medicineTitle");
    amount = o.amountInr;
    paymentId = o.razorpayPaymentId;
    rows = [
      [t("number"), receiptNumber(kind, o.id)],
      [t("paymentDate"), formatIst(o.paidAt, "dd LLL yyyy")],
      [t("patient"), patient.name],
      [t("medicines"), o.title],
      o.chosenDurationDays ? [t("supply"), durationLabel(o.chosenDurationDays)] : null,
      o.address ? [t("shipTo"), o.address] : null,
      [
        t("dispatch"),
        o.status === "shipped" && o.shippedAt
          ? t("dispatchedOn", { date: formatIst(o.shippedAt, "dd LLL yyyy") })
          : t("toBeDispatched"),
      ],
      o.courierRef ? [t("courierRef"), o.courierRef] : null,
    ].filter(Boolean);
  }

  return (
    <main className="receipt-page min-h-screen bg-cream px-4 py-10">
      <article className="mx-auto max-w-2xl bg-white rounded-2xl border border-[var(--border)] p-6 sm:p-10 shadow-sm">
        <header className="border-b border-[var(--border)] pb-5">
          <p className="font-display text-2xl font-semibold text-sage-deep">
            {settings.brand_name}
          </p>
          <p className="mt-1 font-semibold text-ink">
            {profile.name}
            {degrees ? `, ${degrees}` : ""}
          </p>
          {reg && <p className="text-sm text-ink-soft">{reg}</p>}
          {settings.clinic_address && (
            <p className="text-sm text-ink-soft whitespace-pre-line">
              {settings.clinic_address}
            </p>
          )}
          {settings.contact_email && (
            <p className="text-sm text-ink-soft">{settings.contact_email}</p>
          )}
        </header>

        <h1 className="mt-6 font-display text-xl font-semibold text-ink">{title}</h1>

        <dl className="mt-4 divide-y divide-[var(--border)] text-sm">
          {rows.map(([label, value]) => (
            <div key={label} className="grid grid-cols-[9rem_1fr] gap-3 py-2">
              <dt className="text-ink-soft">{label}</dt>
              <dd className="text-ink whitespace-pre-line break-words">{value}</dd>
            </div>
          ))}
        </dl>

        <div className="mt-6 rounded-xl bg-cream-deep p-4 grid grid-cols-[9rem_1fr] gap-3 items-baseline">
          <span className="text-sm text-ink-soft">{t("amountPaid")}</span>
          <span className="font-display text-2xl font-semibold text-ink">₹{amount}</span>
          {paymentId && (
            <>
              <span className="text-sm text-ink-soft">{t("paymentMethod")}</span>
              <span className="text-sm text-ink">{t("online")}</span>
              <span className="text-sm text-ink-soft">{t("paymentId")}</span>
              <span className="text-sm text-ink break-all">{paymentId}</span>
            </>
          )}
        </div>

        {settings.receipt_note && (
          <p className="mt-6 text-sm text-ink whitespace-pre-line">{settings.receipt_note}</p>
        )}
        <p className="mt-4 text-xs text-ink-soft">{t("computerGenerated")}</p>
      </article>

      <div className="mx-auto max-w-2xl mt-6 flex justify-center">
        <PrintButton label={t("print")} />
      </div>
    </main>
  );
}
