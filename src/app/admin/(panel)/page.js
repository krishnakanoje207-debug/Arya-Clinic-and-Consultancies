import Link from "next/link";
import {
  getDashboardStats,
  getQueueBuckets,
  getStorageUsage,
  getUpcomingAppointments,
} from "@/lib/admin";
import { db } from "@/db";
import { services } from "@/db/schema";
import { formatIst } from "@/lib/time";
import { sheetUrl } from "@/lib/sheets";
import ArchiveTool from "@/components/admin/ArchiveTool";
import Bucket from "@/components/admin/QueueBucket";
import FilledSlotsManager from "@/components/admin/FilledSlotsManager";
import RunningLateButton from "@/components/admin/RunningLateButton";

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
  const [stats, upcoming, storage, queue, serviceRows] =
    await Promise.all([
      getDashboardStats().catch(() => ({})),
      getUpcomingAppointments(8).catch(() => []),
      getStorageUsage().catch(() => null),
      getQueueBuckets().catch(() => ({ remaining: [], delayed: [], completed: [] })),
      db
        .select({ id: services.id, title: services.title, mode: services.mode, active: services.active })
        .from(services)
        .orderBy(services.sortOrder)
        .catch(() => []),
    ]);
  const sheet = sheetUrl();

  return (
    <div className="space-y-8">
      <h1 className="font-display text-2xl text-sage-deep font-semibold">
        Dashboard
      </h1>

      <section className="space-y-4">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-2 flex-wrap">
            <h2 className="font-semibold text-ink">Today&apos;s queue</h2>
            <span className="text-xs rounded-full bg-sage-soft px-2 py-0.5">
              Remaining {queue.remaining.length}
            </span>
            <span className="text-xs rounded-full bg-sage-soft px-2 py-0.5">
              Delayed {queue.delayed.length}
            </span>
            <span className="text-xs rounded-full bg-sage-soft px-2 py-0.5">
              Completed {queue.completed.length}
            </span>
          </div>
          <div className="flex items-center gap-3 flex-wrap">
            <RunningLateButton />
            <Link href="/admin/queue" className="btn-ghost text-sm">
              Open full queue →
            </Link>
          </div>
        </div>
        <Bucket
          title="Remaining"
          hint="Confirmed and still upcoming — soonest first."
          rows={queue.remaining}
          actionable
        />
        <Bucket
          title="Delayed"
          hint="Confirmed but their time has passed while a consult overran — waiting in queue."
          rows={queue.delayed}
          actionable
        />
      </section>

      <details className="card-warm p-5">
        <summary className="font-semibold text-ink cursor-pointer">
          Mark slots as booked
        </summary>
        <div className="mt-4">
          <FilledSlotsManager services={serviceRows} />
        </div>
      </details>

      <section>
        <h2 className="font-semibold text-ink mb-3">Consultation records</h2>
        <div className="card-warm p-5 flex items-center gap-3 flex-wrap">
          {sheet && (
            <a
              href={sheet}
              target="_blank"
              rel="noopener noreferrer"
              className="btn-ghost text-sm"
            >
              Open Google Sheet
            </a>
          )}
          <a href="/admin/queue/export" className="btn-ghost text-sm" download>
            Download CSV
          </a>
        </div>
      </section>

      <div className="grid gap-4 sm:grid-cols-2">
        <Stat
          label="Upcoming confirmed"
          value={stats.upcomingConfirmed ?? 0}
          href="/admin/appointments"
        />
        <Stat
          label="In queue now"
          value={queue.remaining.length + queue.delayed.length}
          href="/admin/queue"
        />
      </div>

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
