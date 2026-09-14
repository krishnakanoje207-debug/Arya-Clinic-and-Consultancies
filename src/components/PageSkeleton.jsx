/** Shared route-transition placeholder for the public pages' loading.js files.
 * Pure CSS pulse — no client JS, no translations (it is never read aloud;
 * the live region below announces the load instead). */
export default function PageSkeleton({ rows = 3 }) {
  return (
    <div
      className="mx-auto max-w-7xl px-4 py-16 animate-pulse"
      aria-busy="true"
      aria-live="polite"
    >
      <span className="sr-only">Loading…</span>
      <div className="h-8 w-2/3 max-w-md rounded-lg bg-sage-soft" />
      <div className="mt-4 h-4 w-1/2 max-w-sm rounded bg-cream-deep" />
      <div className="mt-10 grid gap-6 md:grid-cols-3">
        {Array.from({ length: rows * 3 }).map((_, i) => (
          <div
            key={i}
            className="h-40 rounded-2xl bg-cream-deep ring-1 ring-[var(--border)]"
          />
        ))}
      </div>
    </div>
  );
}
