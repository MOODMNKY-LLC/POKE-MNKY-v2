export default function ScheduleLoading() {
  return (
    <div className="container mx-auto px-4 md:px-6 py-8 space-y-6">
      <div className="h-10 w-40 animate-pulse rounded bg-muted" />
      <div className="h-12 w-full max-w-xs animate-pulse rounded bg-muted" />
      <div className="space-y-4">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="h-20 w-full animate-pulse rounded-lg bg-muted" />
        ))}
      </div>
    </div>
  )
}
