export default function VideosLoading() {
  return (
    <div className="container mx-auto px-4 md:px-6 py-8 space-y-6">
      <div className="h-10 w-36 animate-pulse rounded bg-muted" />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div key={i} className="rounded-lg overflow-hidden">
            <div className="aspect-video w-full animate-pulse rounded bg-muted" />
            <div className="h-4 w-3/4 mt-2 animate-pulse rounded bg-muted" />
          </div>
        ))}
      </div>
    </div>
  )
}
