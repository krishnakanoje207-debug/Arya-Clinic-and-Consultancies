import { asc } from "drizzle-orm";
import { db } from "@/db";
import { messageTemplates } from "@/db/schema";
import EntityManager from "@/components/admin/EntityManager";
import { deleteTemplate, upsertTemplate } from "@/app/admin/actions/templates";

export const dynamic = "force-dynamic";

const EVENTS = [
  "booking_received",
  "payment_received",
  "confirmed",
  "reminder",
  "rescheduled",
  "cancelled",
  "follow_up",
].map((e) => ({ value: e, label: e.replace(/_/g, " ") }));

const CHANNELS = [
  { value: "email", label: "Email" },
  { value: "sms", label: "SMS" },
];

const PLACEHOLDERS = [
  "{patient_name}", "{date}", "{time}", "{service}", "{amount}",
  "{meet_link}", "{manage_link}", "{upi_id}", "{doctor_name}", "{whatsapp_link}",
];

export default async function AdminTemplates() {
  const items = await db
    .select()
    .from(messageTemplates)
    .orderBy(asc(messageTemplates.event), asc(messageTemplates.channel))
    .catch(() => []);

  return (
    <div className="space-y-6">
      <h1 className="font-display text-2xl text-sage-deep font-semibold">
        Notification templates
      </h1>
      <div className="card-warm p-4 text-sm text-ink-soft">
        Messages sent for each booking event. Use these placeholders — they are
        filled automatically:
        <div className="mt-2 flex flex-wrap gap-1.5">
          {PLACEHOLDERS.map((p) => (
            <code key={p} className="bg-cream-deep px-2 py-0.5 rounded text-xs">
              {p}
            </code>
          ))}
        </div>
        <p className="mt-2">
          Subject applies to email only. Leave the Hindi body empty to use the
          English body for everyone.
        </p>
      </div>

      <EntityManager
        title="Templates"
        items={items}
        upsertAction={upsertTemplate}
        deleteAction={deleteTemplate}
        addLabel="Add template"
        columns={[
          { key: "event", label: "Event", format: "humanize" },
          { key: "channel", label: "Channel" },
          { key: "active", label: "Active", format: "bool" },
        ]}
        fields={[
          { name: "event", label: "Event", type: "select", options: EVENTS },
          { name: "channel", label: "Channel", type: "select", options: CHANNELS },
          { name: "subject", label: "Subject (email only)", fullWidth: true },
          { name: "body", label: "Body", type: "textarea", fullWidth: true },
          { name: "bodyHi", label: "Body (Hindi)", type: "textarea", fullWidth: true },
          { name: "active", label: "Active", type: "checkbox", defaultChecked: true },
        ]}
      />
    </div>
  );
}
