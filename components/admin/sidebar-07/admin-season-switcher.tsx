"use client"

import * as React from "react"
import Link from "next/link"
import { ChevronsUpDown, Plus, Calendar } from "lucide-react"

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar"
import { useToast } from "@/hooks/use-toast"

export type AdminSeason = {
  id: string
  name: string
  plan: string
  is_current?: boolean
}

export function AdminSeasonSwitcher({
  seasons,
  onSetCurrent,
  onOpenCreateSeason,
}: {
  seasons: AdminSeason[]
  onSetCurrent?: (seasonId: string) => void
  onOpenCreateSeason?: () => void
}) {
  const { isMobile } = useSidebar()
  const currentSeason = seasons.find((s) => s.is_current) ?? seasons[0]
  const [activeSeason, setActiveSeason] = React.useState(currentSeason)
  const [settingCurrent, setSettingCurrent] = React.useState(false)

  React.useEffect(() => {
    const next = seasons.find((s) => s.is_current) ?? seasons[0]
    setActiveSeason(next)
  }, [seasons])

  if (!activeSeason && seasons.length === 0) {
    return (
      <SidebarMenu>
        <SidebarMenuItem>
          <SidebarMenuButton size="lg" asChild>
            <Link href="/admin/league#seasons">
              <div className="bg-sidebar-primary text-sidebar-primary-foreground flex aspect-square size-8 items-center justify-center rounded-lg">
                <Calendar className="size-4" />
              </div>
              <div className="grid flex-1 text-left text-sm leading-tight">
                <span className="truncate font-medium">No season</span>
                <span className="truncate text-xs text-muted-foreground">Set current</span>
              </div>
            </Link>
          </SidebarMenuButton>
        </SidebarMenuItem>
      </SidebarMenu>
    )
  }

  if (!activeSeason) return null

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <SidebarMenuButton
              size="lg"
              className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
            >
              <div className="bg-sidebar-primary text-sidebar-primary-foreground flex aspect-square size-8 items-center justify-center rounded-lg">
                <Calendar className="size-4" />
              </div>
              <div className="grid flex-1 text-left text-sm leading-tight">
                <span className="truncate font-medium">{activeSeason.name}</span>
                <span className="truncate text-xs">{activeSeason.plan}</span>
              </div>
              <ChevronsUpDown className="ml-auto" />
            </SidebarMenuButton>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            className="w-(--radix-dropdown-menu-trigger-width) min-w-56 rounded-lg"
            align="start"
            side={isMobile ? "bottom" : "right"}
            sideOffset={4}
          >
            <DropdownMenuLabel className="text-muted-foreground text-xs">
              Seasons
            </DropdownMenuLabel>
            {seasons.map((season, index) => (
              <DropdownMenuItem
                key={season.id}
                onClick={async () => {
                  setActiveSeason(season)
                  if (onSetCurrent && season.id) {
                    setSettingCurrent(true)
                    try {
                      const res = await fetch("/api/admin/seasons/set-current", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ season_id: season.id }),
                      })
                      const data = await res.json().catch(() => ({}))
                      if (res.ok) {
                        onSetCurrent()
                        toast({
                          title: "Current season updated",
                          description: `"${data.current_season?.name ?? season.name}" is now the current season.`,
                        })
                      } else {
                        toast({
                          title: "Error",
                          description: data.error ?? "Failed to set current season",
                          variant: "destructive",
                        })
                      }
                    } finally {
                      setSettingCurrent(false)
                    }
                  }
                }}
                disabled={settingCurrent || season.is_current}
                className="gap-2 p-2"
              >
                <div className="flex size-6 items-center justify-center rounded-md border">
                  <Calendar className="size-3.5 shrink-0" />
                </div>
                {season.name}
                <DropdownMenuShortcut>⌘{index + 1}</DropdownMenuShortcut>
              </DropdownMenuItem>
            ))}
            <DropdownMenuSeparator />
            {onOpenCreateSeason ? (
              <DropdownMenuItem onClick={onOpenCreateSeason} className="gap-2 p-2">
                <div className="flex size-6 items-center justify-center rounded-md border bg-transparent">
                  <Plus className="size-4" />
                </div>
                <span className="text-muted-foreground font-medium">Create Season</span>
              </DropdownMenuItem>
            ) : (
              <DropdownMenuItem asChild className="gap-2 p-2">
                <Link href="/admin/league#seasons">
                  <div className="flex size-6 items-center justify-center rounded-md border bg-transparent">
                    <Plus className="size-4" />
                  </div>
                  <span className="text-muted-foreground font-medium">Create Season</span>
                </Link>
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  )
}
