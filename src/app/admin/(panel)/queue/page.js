import { getQueueBuckets } from "@/lib/admin";
import { sheetUrl } from "@/lib/sheets";
import Bucket from "@/components/admin/QueueBucket";
import RunningLateButton from "@/components/admin/RunningLateButton";

export const dynamic = "force-dynamic";

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
        <div className="flex items-center gap-3 flex-wrap">
          <RunningLateButton />
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
