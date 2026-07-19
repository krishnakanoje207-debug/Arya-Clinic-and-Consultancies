import { desc, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { appointments, patients } from "@/db/schema";
import { formatIst } from "@/lib/time";
import PatientRow from "@/components/admin/PatientRow";

export const dynamic = "force-dynamic";

export default async function AdminPatients() {
  const rows = await db
    .select({
      id: patients.id,
      name: patients.name,
      phone: patients.phone,
      email: patients.email,
      dashboardToken: patients.dashboardToken,
      apptCount: sql`count(${appointments.id})::int`,
      lastStart: sql`max(${appointments.startAt})`,
    })
    .from(patients)
    .leftJoin(appointments, eq(appointments.patientId, patients.id))
    .groupBy(patients.id)
    .orderBy(desc(sql`max(${appointments.startAt})`))
    .limit(500)
    .catch(() => []);

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "";

  return (
    <div className="space-y-6">
      <h1 className="font-display text-2xl text-sage-deep font-semibold">
        Patients
      </h1>
      <p className="text-sm text-ink-soft max-w-2xl">
        Every person who has booked, keyed by phone number. Each has a private
        dashboard link showing their own appointments — copy it to share
        directly, or regenerate it to invalidate a link that was exposed.
      </p>
      {rows.length ? (
        <div className="card-warm overflow-x-auto">
          <table className="w-full text-left">
            <thead className="text-xs uppercase text-ink-soft">
              <tr>
                <th className="p-3">Name</th>
                <th className="p-3">Phone</th>
                <th className="p-3">Email</th>
                <th className="p-3">Appts</th>
                <th className="p-3">Last (IST)</th>
                <th className="p-3">Dashboard link</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((p) => (
                <PatientRow
                  key={p.id}
                  patient={p}
                  dashboardUrl={`${siteUrl}/patient/${p.dashboardToken}`}
                  apptCount={p.apptCount}
                  lastLabel={p.lastStart ? formatIst(p.lastStart) : "—"}
                />
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="text-sm text-ink-soft">No patients yet.</p>
      )}
    </div>
  );
}
