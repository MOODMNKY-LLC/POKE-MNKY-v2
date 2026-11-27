import { Skeleton } from "@/components/ui/skeleton"

// Lightweight root fallback: no images (the root layout already draws the background).
// The site header comes from the layout, so the first bar stands in for the page's own toolbar.
const pulse = "motion-reduce:animate-none"

export default function Loading() {
  return (
    <div
      role="status"
      aria-live="polite"
      className="container mx-auto flex flex-col gap-6 px-4 py-8 md:px-6"
    >
      <span className="sr-only">Loading…</span>
      <Skeleton className={`h-16 w-full ${pulse}`} />
      <Skeleton className={`h-9 w-2/3 max-w-md ${pulse}`} />
      <div className="grid gap-4 sm:grid-cols-2">
        <Skeleton className={`h-40 ${pulse}`} />
        <Skeleton className={`h-40 ${pulse}`} />
        <Skeleton className={`h-40 ${pulse}`} />
        <Skeleton className={`h-40 ${pulse}`} />
      </div>
    </div>
  )
}
