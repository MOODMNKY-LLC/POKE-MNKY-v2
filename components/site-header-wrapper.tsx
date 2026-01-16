"use client"

import { SiteHeader } from "@/components/site-header"

/**
 * Client-side wrapper for SiteHeader.
 * SiteHeader handles all data fetching client-side, so we don't need server-side data fetching here.
 * This avoids the server/client boundary issues with cookies() API.
 */
export function SiteHeaderWrapper() {
  // SiteHeader will fetch user data client-side
  // Pass undefined to indicate no server-side data was fetched
  return <SiteHeader />
}
