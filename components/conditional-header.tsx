"use client"

import { usePathname } from "next/navigation"
import { SiteHeaderWrapper } from "@/components/site-header-wrapper"

/**
 * Conditionally renders the site header based on the current route.
 * Hides the header on dashboard routes since the dashboard has its own sidebar navigation.
 */
export function ConditionalHeader() {
  const pathname = usePathname()
  
  // Hide header on dashboard routes
  if (pathname?.startsWith("/dashboard")) {
    return null
  }

  return <SiteHeaderWrapper />
}

function HeaderSkeleton() {
  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 items-center">
        <Skeleton className="h-8 w-32" />
        <div className="ml-auto flex items-center gap-4">
          <Skeleton className="h-8 w-8 rounded-full" />
        </div>
      </div>
    </header>
  )
}
