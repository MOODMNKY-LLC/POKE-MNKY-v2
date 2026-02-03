export default function DashboardLoading() {
  return (
    <div className="container mx-auto px-4 md:px-6 py-8 space-y-6">
      <div className="h-10 w-56 animate-pulse rounded bg-muted" />
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-24 rounded-lg border border-border bg-card animate-pulse bg-muted/50" />
        ))}
      </div>
      <div className="h-48 w-full animate-pulse rounded-lg bg-muted" />
    </div>
  )
}
