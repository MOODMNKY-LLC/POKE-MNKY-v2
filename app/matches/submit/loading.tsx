export default function MatchSubmitLoading() {
  return (
    <div className="container mx-auto px-4 md:px-6 py-8 space-y-6">
      <div className="h-10 w-52 animate-pulse rounded bg-muted" />
      <div className="rounded-lg border border-border bg-card p-6 space-y-4 max-w-2xl">
        <div className="h-4 w-28 animate-pulse rounded bg-muted" />
        <div className="h-10 w-full animate-pulse rounded bg-muted" />
        <div className="h-4 w-24 animate-pulse rounded bg-muted" />
        <div className="h-24 w-full animate-pulse rounded bg-muted" />
      </div>
    </div>
  )
}
