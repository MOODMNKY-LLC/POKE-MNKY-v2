export default function PlayoffsLoading() {
  return (
    <div className="container mx-auto px-4 md:px-6 py-8 space-y-6">
      <div className="h-10 w-40 animate-pulse rounded bg-muted" />
      <div className="flex flex-col items-center gap-8">
        <div className="h-32 w-64 animate-pulse rounded bg-muted" />
        <div className="h-24 w-full max-w-2xl animate-pulse rounded bg-muted" />
      </div>
    </div>
  )
}
