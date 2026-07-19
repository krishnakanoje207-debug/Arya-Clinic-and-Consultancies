import { getQueueBuckets } from "@/lib/admin";
import { formatIst } from "@/lib/time";
import { sheetUrl } from "@/lib/sheets";
import MarkCompletedButton from "@/components/admin/MarkCompletedButton";

export const dynamic = "force-dynamic";

function snippet(text, n = 80) {
  if (!text) return "";
  const s = String(text).trim();
  return s.length > n ? `${s.slice(0, n)}…` : s;
}

function Bucket({ title, hint, rows, actionable }) {
  return (
    <section>
      <h2 className="font-semibold text-ink mb-1">
        {title} <span className="text-ink-soft font-normal">({rows.length})</span>
      </h2>
      {hint && <p className="text-xs text-ink-soft mb-3">{hint}</p>}
      {rows.length ? (
        <div className="card-warm overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="text-xs uppercase text-ink-soft">
              <tr>
                <th className="p-3">Patient</th>
                <th className="p-3">Service</th>
                <th className="p-3">When (IST)</th>
                <th className="p-3">Problem</th>
                {actionable && <th className="p-3 text-right">Action</th>}
              </tr>
            </thead>
            <tbody>
              {rows.map(({ appt, serviceTitle }) => (
                <tr key={appt.id} className="border-t border-[var(--border)] align-top">
                  <td className="p-3">
                    <div className="font-semibold">{appt.patientName}</div>
                    <div className="text-xs text-ink-soft">{appt.patientPhone}</div>
                  </td>
                  <td className="p-3">{serviceTitle}</td>
                  <td className="p-3 whitespace-nowrap">{formatIst(appt.startAt)}</td>
                  <td className="p-3 text-ink-soft">{snippet(appt.problemNote)}</td>
                  {actionable && (
                    <td className="p-3 text-right">
                      <MarkCompletedButton id={appt.id} />
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="text-sm text-ink-soft">None.</p>
      )}
    </section>
  );
}

export default async function AdminQueue() {
  const { remaining, delayed, completed } = await getQueueBuckets().catch(() => ({
    remaining: [],
    delayed: [],
    completed: [],
  }));
  const sheet = sheetUrl();

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <h1 className="font-display text-2xl text-sage-deep font-semibold">
          Patient management
        </h1>
        <div className="flex items-center gap-3">
          {sheet && (
            <a href={sheet} target="_blank" rel="noopener noreferrer" className="btn-ghost text-sm">
              Open Excel sheet
            </a>
          )}
          <a href="/admin/queue/export" className="btn-ghost text-sm" download>
            Download Excel
          </a>
        </div>
      </div>

      <Bucket
        title="Remaining"
        hint="Confirmed and still upcoming — soonest first."
        rows={remaining}
        actionable
      />
      <Bucket
        title="Delayed"
        hint="Confirmed but their time has passed while a consult overran — waiting in queue."
        rows={delayed}
        actionable
      />
      <Bucket
        title="Completed"
        hint="Most recent 50, newest first."
        rows={completed}
        actionable={false}
      />
    </div>
  );
}
