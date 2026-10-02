import { formatIst } from "@/lib/time";
import QueueRow from "@/components/admin/QueueRow";

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
                <QueueRow
                  key={appt.id}
                  appt={appt}
                  serviceTitle={serviceTitle}
                  whenLabel={formatIst(appt.startAt)}
                  actionable={actionable}
                />
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
