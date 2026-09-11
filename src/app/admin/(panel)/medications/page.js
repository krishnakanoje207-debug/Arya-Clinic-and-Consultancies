import { asc, desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { medicationOrders, patients } from "@/db/schema";
import { formatIst } from "@/lib/time";
import MedicationCreateForm from "@/components/admin/MedicationCreateForm";
import MedicationRow from "@/components/admin/MedicationRow";
import { medicineHasReceipt, receiptPath } from "@/lib/receipts";

export const dynamic = "force-dynamic";

export default async function AdminMedications() {
  const [patientList, orders] = await Promise.all([
    db
      .select({ id: patients.id, name: patients.name, phone: patients.phone })
      .from(patients)
      .orderBy(asc(patients.name))
      .limit(1000)
      .catch(() => []),
    db
      .select({
        order: medicationOrders,
        patientName: patients.name,
        patientPhone: patients.phone,
      })
      .from(medicationOrders)
      .leftJoin(patients, eq(medicationOrders.patientId, patients.id))
      .orderBy(desc(medicationOrders.createdAt))
      .limit(500)
      .catch(() => []),
  ]);

  return (
    <div className="space-y-6">
      <h1 className="font-display text-2xl text-sage-deep font-semibold">
        Medications
      </h1>
      <p className="text-sm text-ink-soft max-w-2xl">
        Orders for medicines you parcel yourself after a consultation. Create an
        order, pricing each duration you allow; the patient picks one, enters a
        shipping address and pays securely through Razorpay. Paid orders are
        confirmed automatically — just mark them shipped once dispatched.
      </p>

      {patientList.length ? (
        <MedicationCreateForm patients={patientList} />
      ) : (
        <p className="text-sm text-ink-soft">
          No patients yet — a patient must have booked before you can create an
          order for them.
        </p>
      )}

      {orders.length ? (
        <div className="card-warm overflow-x-auto">
          <table className="w-full text-left">
            <thead className="text-xs uppercase text-ink-soft">
              <tr>
                <th className="p-3">Medicines</th>
                <th className="p-3">Patient</th>
                <th className="p-3">Status</th>
                <th className="p-3">Duration / options</th>
                <th className="p-3">Address</th>
                <th className="p-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {orders.map(({ order, patientName, patientPhone }) => (
                <MedicationRow
                  key={order.id}
                  order={order}
                  patientName={patientName}
                  patientPhone={patientPhone}
                  createdLabel={formatIst(order.createdAt)}
                  receiptUrl={
                    medicineHasReceipt(order) ? receiptPath("medicine", order.id) : null
                  }
                />
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="text-sm text-ink-soft">No medication orders yet.</p>
      )}
    </div>
  );
}
