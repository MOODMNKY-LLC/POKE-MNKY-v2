"use client"

import { usePathname } from "next/navigation"
import { SidebarTrigger } from "@/components/ui/sidebar"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"
import { Separator } from "@/components/ui/separator"

const pathLabels: Record<string, string> = {
  "": "Overview",
  sync: "Sync Hub",
  "sync-logs": "Sync Logs",
  league: "League",
  teams: "Teams",
  matches: "Matches",
  trades: "Trades",
  "draft-pool-rules": "Draft Pool & Rules",
  "draft-board-management": "Draft Board",
  draft: "Draft",
  playoffs: "Playoffs",
  users: "Users",
  "pokepedia-dashboard": "Pokepedia",
  pokemon: "Pokemon Catalog",
  discord: "Discord",
  "google-sheets": "Google Sheets",
  simulation: "Simulation",
  music: "Music",
  sessions: "Draft Sessions",
}

function getBreadcrumbSegments(pathname: string) {
  const segments = pathname.replace(/^\/admin\/?/, "").split("/").filter(Boolean)
  return segments.map((seg, i) => ({
    path: "/admin/" + segments.slice(0, i + 1).join("/"),
    label: pathLabels[seg] || seg.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()),
    isLast: i === segments.length - 1,
  }))
}

export function AdminLayoutHeader() {
  const pathname = usePathname()
  const segments = getBreadcrumbSegments(pathname || "")

  return (
    <header className="flex h-14 shrink-0 flex-col justify-center gap-1 border-b border-border px-4">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <SidebarTrigger className="-ml-1" />
          <Separator orientation="vertical" className="h-4" />
          <Breadcrumb>
            <BreadcrumbList>
              <BreadcrumbItem>
                <BreadcrumbLink asChild>
                  <Link href="/admin">Admin</Link>
                </BreadcrumbLink>
              </BreadcrumbItem>
              {segments.length === 0 ? (
                <>
                  <BreadcrumbSeparator />
                  <BreadcrumbItem>
                    <BreadcrumbPage>Overview</BreadcrumbPage>
                  </BreadcrumbItem>
                </>
              ) : (
                segments.flatMap((seg) => [
                  <BreadcrumbSeparator key={`sep-${seg.path}`} />,
                  <BreadcrumbItem key={seg.path}>
                    {seg.isLast ? (
                      <BreadcrumbPage>{seg.label}</BreadcrumbPage>
                    ) : (
                      <BreadcrumbLink asChild>
                        <Link href={seg.path}>{seg.label}</Link>
                      </BreadcrumbLink>
                    )}
                  </BreadcrumbItem>,
                ])
              )}
            </BreadcrumbList>
          </Breadcrumb>
        </div>
        <Button asChild variant="outline" size="sm">
          <Link href="/">View Site</Link>
        </Button>
      </div>
    </header>
  )
}
