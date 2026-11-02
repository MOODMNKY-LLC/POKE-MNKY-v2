"use client"

import * as React from "react"
import Link from "next/link"
import { Search } from "lucide-react"
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { SidebarTrigger } from "@/components/ui/sidebar"
import { OPEN_COMMAND_PALETTE_EVENT } from "@/components/command-palette"
import { getBreadcrumbs } from "@/lib/nav/coach-nav"
import { useNavLocation } from "@/components/dashboard/use-nav-location"

export function DashboardHeader() {
  const { pathname, tab } = useNavLocation()
  const crumbs = getBreadcrumbs(pathname, tab)

  return (
    <header className="sticky top-0 z-30 flex h-14 shrink-0 items-center gap-2 border-b bg-background/95 px-4 backdrop-blur supports-[backdrop-filter]:bg-background/80">
      <SidebarTrigger className="-ml-1 max-md:size-11" />
      <Separator orientation="vertical" className="mr-1 h-4" />
      <Breadcrumb className="min-w-0 flex-1">
        <BreadcrumbList className="flex-nowrap">
          {crumbs.map((crumb, index) => {
            const isLast = index === crumbs.length - 1
            return (
              <React.Fragment key={`${crumb.label}-${index}`}>
                <BreadcrumbItem className={isLast ? "min-w-0" : "hidden min-w-0 sm:inline-flex"}>
                  {isLast ? (
                    <BreadcrumbPage className="truncate">{crumb.label}</BreadcrumbPage>
                  ) : crumb.href ? (
                    <BreadcrumbLink asChild>
                      <Link href={crumb.href}>{crumb.label}</Link>
                    </BreadcrumbLink>
                  ) : (
                    <span className="text-muted-foreground">{crumb.label}</span>
                  )}
                </BreadcrumbItem>
                {!isLast && <BreadcrumbSeparator className="hidden sm:block" />}
              </React.Fragment>
            )
          })}
        </BreadcrumbList>
      </Breadcrumb>
      <Button
        variant="outline"
        size="sm"
        className="gap-2 text-muted-foreground max-md:size-11 max-md:p-0"
        onClick={() => window.dispatchEvent(new Event(OPEN_COMMAND_PALETTE_EVENT))}
      >
        <Search className="size-4" aria-hidden="true" />
        <span className="hidden md:inline">Search</span>
        <kbd className="pointer-events-none hidden rounded border bg-muted px-1.5 font-mono text-[10px] md:inline">
          Ctrl K
        </kbd>
        <span className="sr-only md:hidden">Search</span>
      </Button>
    </header>
  )
}
