export const metadata = { title: "Offline", robots: { index: false, follow: false } };

export default function OfflinePage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center text-center px-6">
      <h1 className="font-display text-3xl text-sage-deep font-semibold">
        You&apos;re offline
      </h1>
      <p className="mt-3 text-ink-soft max-w-sm">
        Please check your connection and try again. Your booking details are
        safe — reopen this page once you&apos;re back online.
      </p>
    </div>
  );
}
