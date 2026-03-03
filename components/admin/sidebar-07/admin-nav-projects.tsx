"use client"

import Link from "next/link"
import {
  ClipboardList,
  ExternalLink,
  MoreHorizontal,
  type LucideIcon,
} from "lucide-react"

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuAction,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar"

export type AdminActiveSession = {
  id: string
  name: string
  url: string
  icon?: LucideIcon
}

export function AdminNavProjects({
  sessions,
}: {
  sessions: AdminActiveSession[]
}) {
  const { isMobile } = useSidebar()

  if (sessions.length === 0) {
    return (
      <SidebarGroup>
        <SidebarGroupLabel>Active Sessions</SidebarGroupLabel>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              size="sm"
              className="text-muted-foreground"
              asChild
            >
              <Link href="/admin/draft/sessions">
                <ClipboardList className="size-4" />
                <span>No active sessions</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton size="sm" asChild>
              <Link href="/admin/draft/sessions">
                <span>View all</span>
                <ExternalLink className="ml-auto size-3.5" />
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarGroup>
    )
  }

  return (
    <SidebarGroup>
      <SidebarGroupLabel>Active Sessions</SidebarGroupLabel>
      <SidebarMenu>
        {sessions.map((session) => {
          const Icon = session.icon ?? ClipboardList
          return (
            <SidebarMenuItem key={session.id}>
              <SidebarMenuButton tooltip={session.name} asChild>
                <Link href={session.url}>
                  <Icon className="size-4" />
                  <span>{session.name}</span>
                </Link>
              </SidebarMenuButton>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <SidebarMenuAction showOnHover>
                    <MoreHorizontal className="size-4" />
                    <span className="sr-only">More</span>
                  </SidebarMenuAction>
                </DropdownMenuTrigger>
                <DropdownMenuContent
                  className="w-48 rounded-lg"
                  side={isMobile ? "bottom" : "right"}
                  align="end"
                  sideOffset={4}
                >
                  <DropdownMenuItem asChild>
                    <Link href={session.url}>View</Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <a href={session.url} target="_blank" rel="noopener noreferrer">
                      Open in new tab
                    </a>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </SidebarMenuItem>
          )
        })}
        <SidebarMenuItem>
          <SidebarMenuButton size="sm" asChild>
            <Link href="/admin/draft/sessions">
              <span>More</span>
              <ExternalLink className="ml-auto size-3.5" />
            </Link>
          </SidebarMenuButton>
        </SidebarMenuItem>
      </SidebarMenu>
    </SidebarGroup>
  )
}
