import { getSettings } from "@/lib/settings";

export const metadata = { title: "Cancellation & Reschedule Policy" };

export default async function PolicyPage() {
  const { cancel_cutoff_hours } = await getSettings(["cancel_cutoff_hours"]);
  const cutoff = Number(cancel_cutoff_hours) || 4;

  return (
    <article className="mx-auto max-w-3xl px-4 py-16">
      <h1 className="font-display text-3xl text-sage-deep font-semibold mb-6">
        Cancellation &amp; Reschedule Policy
      </h1>
      <div className="space-y-4 text-ink-soft leading-relaxed">
        <p>
          Every confirmation message includes a secure link to reschedule or
          cancel your appointment — no account needed.
        </p>
        <ul className="list-disc pl-5 space-y-2">
          <li>
            <strong className="text-ink">Rescheduling</strong> is free up to{" "}
            {cutoff} hours before your slot, subject to availability. Within{" "}
            {cutoff} hours of a confirmed appointment, please contact the clinic
            directly.
          </li>
          <li>
            <strong className="text-ink">Cancellations</strong> free your slot
            immediately so another patient can book it. Confirmed appointments
            can be cancelled online up to {cutoff} hours before the start time.
          </li>
          <li>
            <strong className="text-ink">Refunds</strong> for prepaid UPI
            amounts are handled directly by the clinic on a case-by-case basis.
            If your payment was received but your slot lapsed, submit your
            transaction reference and the doctor will restore or reschedule it —
            no payment is ever lost.
          </li>
        </ul>
        <p className="text-sm">
          This is a general policy; the doctor may accommodate genuine
          emergencies at her discretion.
        </p>
      </div>
    </article>
  );
}
