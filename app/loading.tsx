// Skeleton in the shape of the real page: the layout doesn't jump when data lands,
// and the wait reads as "loading this" rather than "loading something".
const RATIOS = ["4/5", "1/1", "3/4", "1/1", "4/5", "3/4", "1/1", "4/5"];

export default function Loading() {
  return (
    <main
      id="main"
      className="page max-w-6xl flex-1"
      role="status"
      aria-busy="true"
      aria-label="Loading photos"
    >
      <div className="mb-6 sm:mb-8">
        <div className="h-9 w-40 animate-pulse rounded-lg bg-cb-surface" />
        <div className="mt-3 h-4 w-72 max-w-full animate-pulse rounded bg-cb-surface" />
      </div>

      <div className="card p-4 sm:p-5">
        <div className="mb-3 h-3 w-16 animate-pulse rounded bg-cb-surface" />
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className="h-11 animate-pulse rounded-[var(--r-control)] bg-cb-surface"
            />
          ))}
        </div>
      </div>

      <div className="mb-4 mt-5 h-4 w-24 animate-pulse rounded bg-cb-surface" />

      <div className="columns-1 gap-3 min-[420px]:columns-2 sm:columns-3 sm:gap-4 lg:columns-4 2xl:columns-5 [&>*]:mb-3 sm:[&>*]:mb-4">
        {RATIOS.map((r, i) => (
          <div
            key={i}
            className="animate-pulse rounded-[var(--r-card)] border border-cb-border bg-cb-surface"
            style={{ aspectRatio: r, animationDelay: `${i * 60}ms` }}
          />
        ))}
      </div>

      <span className="sr-only">Loading photos…</span>
    </main>
  );
}
