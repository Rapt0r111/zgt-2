/**
 * /personnel/loading.tsx — shown during initial page navigation
 */

export default function PersonnelLoading() {
  return (
    <div className="container mx-auto max-w-6xl px-4 py-8 space-y-6 animate-pulse">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-muted" />
          <div className="space-y-1.5">
            <div className="h-5 w-36 bg-muted rounded" />
            <div className="h-3.5 w-52 bg-muted rounded" />
          </div>
        </div>
        <div className="flex gap-2">
          <div className="h-9 w-20 rounded-lg bg-muted" />
          <div className="h-9 w-28 rounded-lg bg-muted" />
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="h-16 rounded-lg bg-muted" />
        ))}
      </div>

      {/* Filters */}
      <div className="flex gap-3">
        <div className="flex-1 h-9 rounded-lg bg-muted" />
        <div className="h-9 w-36 rounded-lg bg-muted" />
        <div className="h-9 w-32 rounded-lg bg-muted" />
      </div>

      {/* Table */}
      <div className="rounded-xl border border-border overflow-hidden">
        <div className="h-11 bg-muted/40 border-b border-border" />
        {Array.from({ length: 10 }).map((_, i) => (
          <div
            key={i}
            className="flex items-center gap-4 px-4 py-3 border-b border-border last:border-0"
          >
            <div className="w-8 h-8 rounded-full bg-muted shrink-0" />
            <div className="flex-1 space-y-1.5">
              <div className="h-3.5 bg-muted rounded w-2/5" />
              <div className="h-2.5 bg-muted rounded w-1/4" />
            </div>
            <div className="h-3.5 bg-muted rounded w-24 hidden md:block" />
            <div className="h-3.5 bg-muted rounded w-20 hidden md:block" />
            <div className="h-5 bg-muted rounded-full w-16" />
            <div className="w-6 h-6 rounded bg-muted" />
          </div>
        ))}
      </div>
    </div>
  );
}