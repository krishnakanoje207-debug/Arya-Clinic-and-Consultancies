import { listAppointments } from "@/lib/admin";
import { formatIst } from "@/lib/time";
import AppointmentRow from "@/components/admin/AppointmentRow";
import { consultationHasReceipt, receiptPath } from "@/lib/receipts";

export const dynamic = "force-dynamic";

export default async function AdminAppointments() {
  const rows = await listAppointments(200).catch(() => []);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-2xl text-sage-deep font-semibold">
          Appointments
        </h1>
        <a
          href="/admin/appointments/export"
          className="btn-ghost text-sm"
          download
        >
          Export CSV
        </a>
      </div>
      {rows.length ? (
        <div className="card-warm overflow-x-auto">
          <table className="w-full text-left">
            <thead className="text-xs uppercase text-ink-soft">
              <tr>
                <th className="p-3">Patient</th>
                <th className="p-3">Service</th>
                <th className="p-3">When (IST)</th>
                <th className="p-3">Mode</th>
                <th className="p-3">Status</th>
                <th className="p-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(({ appt, serviceTitle }) => (
                <AppointmentRow
                  key={appt.id}
                  appt={appt}
                  serviceTitle={serviceTitle}
                  whenLabel={formatIst(appt.startAt)}
                  receiptUrl={
                    consultationHasReceipt(appt)
                      ? receiptPath("consultation", appt.id)
                      : null
                  }
                />
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="text-sm text-ink-soft">No appointments yet.</p>
      )}
    </div>
  );
}
