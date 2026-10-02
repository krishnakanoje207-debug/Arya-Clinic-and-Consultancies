import { db } from "@/db";
import { availabilityRules, services, slotOverrides } from "@/db/schema";
import EntityManager from "@/components/admin/EntityManager";
import ScheduleCalendar from "@/components/admin/ScheduleCalendar";
import FilledSlotsManager from "@/components/admin/FilledSlotsManager";
import { deleteRule, upsertRule } from "@/app/admin/actions/content";
import { getSettings } from "@/lib/settings";
import { istToday } from "@/lib/time";

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
const KIND_LABEL = { open: "Consulting hours", break: "Break" };

export default async function AdminAvailability() {
  const [rules, overrides, serviceRows, { booking_horizon_days }] = await Promise.all([
    db.select().from(availabilityRules).orderBy(availabilityRules.weekday).catch(() => []),
    db.select().from(slotOverrides).orderBy(slotOverrides.onDate).catch(() => []),
    db
      .select({ id: services.id, title: services.title, mode: services.mode, active: services.active })
      .from(services)
      .orderBy(services.sortOrder)
      .catch(() => []),
    getSettings(["booking_horizon_days"]),
  ]);

  return (
    <div className="space-y-8">
      <h1 className="font-display text-2xl text-sage-deep font-semibold">
        Availability
      </h1>
      <p className="text-sm text-ink-soft -mt-4">
        Slots are generated from these weekly rules, minus breaks, overrides
        and existing bookings. Times are in IST. Each slot&apos;s length
        matches the booked service&apos;s duration — set durations under
        Content ▸ Services. Add a <strong>Break</strong> row (for example
        13:00–14:00) and it is carved out of that weekday every week, so
        lunch never has to be entered again. How far ahead patients may book,
        and the gap left after each consultation, are under Settings.
      </p>

      <EntityManager
        title="Weekly schedule"
        items={rules}
        upsertAction={upsertRule}
        deleteAction={deleteRule}
        addLabel="Add rule"
        columns={[
          { key: "weekday", label: "Day", format: "map", map: WD_LABEL },
          { key: "kind", label: "Type", format: "map", map: KIND_LABEL },
          { key: "startTime", label: "Start" },
          { key: "endTime", label: "End" },
          { key: "mode", label: "Mode" },
          { key: "active", label: "Active", format: "bool" },
        ]}
        fields={[
          { name: "weekday", label: "Day", type: "select", options: WEEKDAYS },
          { name: "kind", label: "Type", type: "select", options: [
            { value: "open", label: "Consulting hours" },
            { value: "break", label: "Break (no bookings)" },
          ] },
          { name: "mode", label: "Mode", type: "select", options: [
            { value: "online", label: "Online" },
            { value: "clinic", label: "Clinic" },
          ] },
          { name: "startTime", label: "Start time", type: "time" },
          { name: "endTime", label: "End time", type: "time" },
          { name: "active", label: "Active", type: "checkbox", defaultChecked: true },
        ]}
      />

      <ScheduleCalendar
        rules={rules}
        overrides={overrides}
        today={istToday()}
        horizonDays={Number(booking_horizon_days) || 14}
      />

      <FilledSlotsManager services={serviceRows} />
    </div>
  );
}
