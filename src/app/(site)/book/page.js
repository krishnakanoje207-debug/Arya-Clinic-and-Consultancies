import { getLocale, getTranslations } from "next-intl/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { appointments, patients } from "@/db/schema";
import { getServices, localized } from "@/lib/content";
import { getSettings, isClinicMode } from "@/lib/settings";
import { tokenSchema } from "@/lib/validation";
import BookingFlow from "@/components/BookingFlow";

export async function generateMetadata() {
  const t = await getTranslations("booking");
  return { title: t("title") };
}

export default async function BookPage({ searchParams }) {
  const sp = await searchParams;
  const locale = await getLocale();
  const [services, settings] = await Promise.all([
    getServices(),
    getSettings(["site_mode"]),
  ]);
  const clinic = isClinicMode(settings);

  const serviceList = services.map((s) => ({
    id: s.id,
    title: localized(s, "title", locale),
    durationMinutes: s.durationMinutes,
    feeInr: s.feeInr,
    mode: s.mode,
  }));

  const preselect = Number(sp?.service) || null;

  // Prefill mode: a valid patient dashboard token (?p=) pre-populates the
  // details form from that patient's record. Fields stay fully editable.
  let prefill = null;
  let patientToken = null;
  const ptok = tokenSchema.safeParse(sp?.p);
  if (ptok.success) {
    try {
      const [pt] = await db
        .select({
          name: patients.name,
          phone: patients.phone,
          email: patients.email,
        })
        .from(patients)
        .where(eq(patients.dashboardToken, ptok.data));
      if (pt) {
        prefill = { name: pt.name, phone: pt.phone, email: pt.email || "" };
        patientToken = ptok.data;
      }
    } catch {
      prefill = null;
      patientToken = null;
    }
  }

  // Reschedule mode: a valid manage token locks the flow to the existing
  // appointment's service and skips details/payment (same row is moved).
  let reschedule = null;
  const tok = tokenSchema.safeParse(sp?.reschedule);
  if (tok.success) {
    try {
      const [appt] = await db
        .select({
          serviceId: appointments.serviceId,
          mode: appointments.mode,
          status: appointments.status,
        })
        .from(appointments)
        .where(eq(appointments.manageToken, tok.data));
      if (appt && ["pending_payment", "confirmed"].includes(appt.status)) {
        reschedule = {
          token: tok.data,
          serviceId: appt.serviceId,
          mode: appt.mode,
        };
      }
    } catch {
      reschedule = null;
    }
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-12">
      <BookingFlow
        services={serviceList}
        clinicMode={clinic}
        preselectServiceId={reschedule?.serviceId ?? preselect}
        reschedule={reschedule}
        prefill={prefill}
        patientToken={patientToken}
      />
    </div>
  );
}
