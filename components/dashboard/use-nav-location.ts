"use client"

import { usePathname, useSearchParams } from "next/navigation"
import { resolveActiveEntry, type NavEntry } from "@/lib/nav/coach-nav"

export function useNavLocation(): { pathname: string; tab: string | null; active: NavEntry | null } {
  const pathname = usePathname()
  const tab = useSearchParams().get("tab")
  return { pathname, tab, active: resolveActiveEntry(pathname, tab) }
}
