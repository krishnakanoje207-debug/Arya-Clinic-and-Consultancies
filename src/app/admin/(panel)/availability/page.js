import { db } from "@/db";
import { availabilityRules, slotOverrides } from "@/db/schema";
import EntityManager from "@/components/admin/EntityManager";
import OverridesManager from "@/components/admin/OverridesManager";
import { deleteRule, upsertRule } from "@/app/admin/actions/content";

export const dynamic = "force-dynamic";

const WEEKDAYS = [
  { value: "0", label: "Sunday" },
  { value: "1", label: "Monday" },
  { value: "2", label: "Tuesday" },
  { value: "3", label: "Wednesday" },
  { value: "4", label: "Thursday" },
  { value: "5", label: "Friday" },
  { value: "6", label: "Saturday" },
];
const WD_LABEL = Object.fromEntries(WEEKDAYS.map((w) => [Number(w.value), w.label]));

export default async function AdminAvailability() {
  const [rules, overrides] = await Promise.all([
    db.select().from(availabilityRules).orderBy(availabilityRules.weekday).catch(() => []),
    db.select().from(slotOverrides).orderBy(slotOverrides.onDate).catch(() => []),
  ]);

  return (
    <div className="space-y-8">
      <h1 className="font-display text-2xl text-sage-deep font-semibold">
        Availability
      </h1>
      <p className="text-sm text-ink-soft -mt-4">
        Slots are generated from these weekly rules, minus overrides and
        existing bookings. Times are in IST. Each slot&apos;s length matches
        the booked service&apos;s duration — set durations under Content ▸
        Services.
      </p>

      <EntityManager
        title="Weekly schedule"
        items={rules}
        upsertAction={upsertRule}
        deleteAction={deleteRule}
        addLabel="Add rule"
        columns={[
          { key: "weekday", label: "Day", format: "map", map: WD_LABEL },
          { key: "startTime", label: "Start" },
          { key: "endTime", label: "End" },
          { key: "mode", label: "Mode" },
          { key: "active", label: "Active", format: "bool" },
        ]}
        fields={[
          { name: "weekday", label: "Day", type: "select", options: WEEKDAYS },
          { name: "mode", label: "Mode", type: "select", options: [
            { value: "online", label: "Online" },
            { value: "clinic", label: "Clinic" },
          ] },
          { name: "startTime", label: "Start time", type: "time" },
          { name: "endTime", label: "End time", type: "time" },
          { name: "active", label: "Active", type: "checkbox", defaultChecked: true },
        ]}
      />

      <OverridesManager overrides={overrides} />
    </div>
  );
}
