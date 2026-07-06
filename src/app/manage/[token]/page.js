import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { appointments, services } from "@/db/schema";
import { formatIst } from "@/lib/time";
import ManageActions from "@/components/ManageActions";

export const metadata = { title: "Manage your appointment" };

export default async function ManagePage({ params }) {
  const { token } = await params;

  let row = null;
  try {
    [row] = await db
      .select({
        appt: appointments,
        serviceTitle: services.title,
      })
      .from(appointments)
      .leftJoin(services, eq(appointments.serviceId, services.id))
      .where(eq(appointments.manageToken, token));
  } catch {
    notFound();
  }

  if (!row) notFound();
  const a = row.appt;

  const statusLabel = {
    pending_payment: "Awaiting payment / verification",
    confirmed: "Confirmed",
    completed: "Completed",
    cancelled: "Cancelled",
    expired: "Expired",
  }[a.status];

  return (
    <div className="min-h-screen bg-cream">
      <div className="mx-auto max-w-lg px-4 py-16">
        <h1 className="font-display text-3xl text-sage-deep font-semibold mb-6">
          Manage your appointment
        </h1>
        <div className="card-warm p-6 space-y-2 text-ink">
          <p>
            <span className="text-ink-soft">Service:</span> {row.serviceTitle}
          </p>
          <p>
            <span className="text-ink-soft">When:</span>{" "}
            {formatIst(a.startAt)} IST
          </p>
          <p>
            <span className="text-ink-soft">Type:</span>{" "}
            {a.mode === "online" ? "Online consultation" : "Clinic visit"}
          </p>
          <p>
            <span className="text-ink-soft">Status:</span> {statusLabel}
          </p>
          {a.meetingLink && a.status === "confirmed" ? (
            <p>
              <a href={a.meetingLink} className="text-sage-deep font-semibold">
                Join video consultation
              </a>
            </p>
          ) : null}
        </div>

        {a.status !== "cancelled" && a.status !== "completed" ? (
          <div className="mt-6">
            <ManageActions token={token} />
          </div>
        ) : null}
      </div>
    </div>
  );
}
