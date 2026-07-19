import { formatIst } from "@/lib/time";
import MarkCompletedButton from "@/components/admin/MarkCompletedButton";

function snippet(text, n = 80) {
  if (!text) return "";
  const s = String(text).trim();
  return s.length > n ? `${s.slice(0, n)}…` : s;
}

/** One queue bucket (remaining / delayed / completed) as a titled table.
 * Shared by /admin/queue and the admin dashboard's Today's queue. */
export default function Bucket({ title, hint, rows, actionable }) {
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
