import Link from "next/link";
import {
  getDashboardStats,
  getPendingVerifications,
  getStorageUsage,
  getUpcomingAppointments,
} from "@/lib/admin";
import { formatIst } from "@/lib/time";
import ArchiveTool from "@/components/admin/ArchiveTool";

export const dynamic = "force-dynamic";

function Stat({ label, value, href, accent }) {
  const body = (
    <div className="card-warm p-5">
      <p className="text-sm text-ink-soft">{label}</p>
      <p className={`mt-1 font-display text-3xl font-semibold ${accent || "text-ink"}`}>
        {value}
      </p>
    </div>
  );
  return href ? <Link href={href}>{body}</Link> : body;
}

export default async function AdminDashboard() {
  const [stats, pending, upcoming, storage] = await Promise.all([
    getDashboardStats().catch(() => ({})),
    getPendingVerifications().catch(() => []),
    getUpcomingAppointments(8).catch(() => []),
    getStorageUsage().catch(() => null),
  ]);

  return (
    <div className="space-y-8">
      <h1 className="font-display text-2xl text-sage-deep font-semibold">
        Dashboard
      </h1>

      <div className="grid gap-4 sm:grid-cols-3">
        <Stat
          label="Payments to verify"
          value={stats.pendingVerification ?? 0}
          href="/admin/appointments"
          accent="text-terracotta"
        />
        <Stat
          label="Paid but hold expired"
          value={stats.needsReview ?? 0}
          href="/admin/appointments"
          accent={stats.needsReview ? "text-terracotta" : "text-ink"}
        />
        <Stat
          label="Upcoming confirmed"
          value={stats.upcomingConfirmed ?? 0}
          href="/admin/appointments"
        />
      </div>

      <section>
        <h2 className="font-semibold text-ink mb-3">Needs attention</h2>
        {pending.length ? (
          <div className="card-warm divide-y divide-[var(--border)]">
            {pending.map(({ appt, serviceTitle }) => (
              <div key={appt.id} className="p-4 flex items-center justify-between text-sm">
                <div>
                  <p className="font-semibold">
                    {appt.patientName}{" "}
                    {appt.needsReview && (
                      <span className="ml-2 text-xs bg-terracotta text-white px-2 py-0.5 rounded-full">
                        paid, hold expired
                      </span>
                    )}
                  </p>
                  <p className="text-ink-soft">
                    {serviceTitle} · {formatIst(appt.startAt)} · UTR: {appt.utr}
                  </p>
                </div>
                <Link href="/admin/appointments" className="btn-ghost text-xs py-1 px-3">
                  Review
                </Link>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-ink-soft">Nothing pending. 🎉</p>
        )}
      </section>

      <section>
        <h2 className="font-semibold text-ink mb-3">Next appointments</h2>
        {upcoming.length ? (
          <ul className="card-warm divide-y divide-[var(--border)] text-sm">
            {upcoming.map(({ appt, serviceTitle }) => (
              <li key={appt.id} className="p-4 flex justify-between">
                <span>{appt.patientName} — {serviceTitle}</span>
                <span className="text-ink-soft">{formatIst(appt.startAt)}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-ink-soft">No upcoming appointments.</p>
        )}
      </section>

      {storage && (
        <section>
          <h2 className="font-semibold text-ink mb-3">Database storage</h2>
          <div className="card-warm p-5">
            <div className="flex justify-between text-sm mb-2">
              <span>{storage.mb} MB used</span>
              <span className="text-ink-soft">{storage.percent}% of 0.5 GB</span>
            </div>
            <div className="h-2 rounded-full bg-sage-soft overflow-hidden">
              <div
                className={`h-full ${storage.percent > 70 ? "bg-terracotta" : "bg-sage"}`}
                style={{ width: `${Math.min(100, storage.percent)}%` }}
              />
            </div>
            {storage.percent > 70 && (
              <p className="mt-3 text-xs text-terracotta-deep">
                Above 70% — archive appointments older than 12 months to
                reclaim space. Full details are emailed (and optionally
                Drive-uploaded) before anything is removed.
              </p>
            )}
            <ArchiveTool />
          </div>
        </section>
      )}
    </div>
  );
}
