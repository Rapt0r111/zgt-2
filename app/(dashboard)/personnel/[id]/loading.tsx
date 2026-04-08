export default function PersonnelDetailLoading() {
  return (
    <div className="container mx-auto max-w-3xl px-4 py-8 space-y-6 animate-pulse">
      {/* Back */}
      <div className="h-4 w-32 bg-muted rounded" />

      {/* Hero card */}
      <div className="rounded-2xl border border-border bg-card overflow-hidden">
        <div className="h-2 bg-muted" />
        <div className="p-6">
          <div className="flex items-start gap-5">
            <div className="w-16 h-16 rounded-2xl bg-muted shrink-0" />
            <div className="flex-1 space-y-2">
              <div className="h-6 bg-muted rounded w-3/5" />
              <div className="h-4 bg-muted rounded w-2/5" />
              <div className="h-5 bg-muted rounded-full w-20 mt-1" />
            </div>
          </div>
        </div>
      </div>

      {/* Details grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {Array.from({ length: 2 }).map((_, i) => (
          <div key={i} className="rounded-xl border border-border bg-card p-4 space-y-3">
            <div className="h-4 bg-muted rounded w-1/3" />
            {Array.from({ length: 3 }).map((_, j) => (
              <div key={j} className="flex gap-3 py-3 border-b border-border last:border-0">
                <div className="w-8 h-8 rounded-lg bg-muted shrink-0" />
                <div className="flex-1 space-y-1.5">
                  <div className="h-3 bg-muted rounded w-1/3" />
                  <div className="h-4 bg-muted rounded w-2/3" />
                </div>
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}