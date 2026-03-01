export default function ProfileLoading() {
  return (
    <div className="container mx-auto px-4 md:px-6 py-8 space-y-6">
      <div className="h-12 w-48 animate-pulse rounded bg-muted" />
      <div className="rounded-lg border border-border bg-card p-6 space-y-4">
        <div className="h-4 w-32 animate-pulse rounded bg-muted" />
        <div className="h-10 w-full animate-pulse rounded bg-muted" />
        <div className="h-4 w-24 animate-pulse rounded bg-muted" />
        <div className="h-10 w-full animate-pulse rounded bg-muted" />
      </div>
    </div>
  )
}
