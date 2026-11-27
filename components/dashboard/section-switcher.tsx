"use client"

import * as React from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { ChevronsUpDown } from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuShortcut,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar"
import {
  getSectionSwitcherSections,
  resolveActiveSection,
  type CoachNavContext,
  type SectionSwitcherSection,
} from "@/lib/nav/coach-nav"

interface SectionSwitcherProps {
  ctx: CoachNavContext
}

export function SectionSwitcher({ ctx }: SectionSwitcherProps) {
  const pathname = usePathname() ?? "/dashboard"
  const { isMobile, setOpenMobile } = useSidebar()
  const sections = React.useMemo(() => getSectionSwitcherSections(ctx), [ctx])
  const active = resolveActiveSection(pathname, sections) ?? sections[0]

  if (!active) return null

  const ActiveIcon = active.icon

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <SidebarMenuButton
              size="lg"
              tooltip={active.name}
              className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground max-md:h-14"
            >
              <div className="bg-sidebar-primary text-sidebar-primary-foreground flex aspect-square size-8 items-center justify-center rounded-lg">
                <ActiveIcon className="size-4" aria-hidden="true" />
              </div>
              <div className="grid flex-1 text-left text-sm leading-tight">
                <span className="truncate font-semibold">{active.name}</span>
                <span className="truncate text-xs text-muted-foreground">{active.description}</span>
              </div>
              <ChevronsUpDown className="ml-auto size-4" aria-hidden="true" />
              <span className="sr-only">Switch site section</span>
            </SidebarMenuButton>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            className="w-(--radix-dropdown-menu-trigger-width) min-w-56 rounded-lg"
            align="start"
            side={isMobile ? "bottom" : "right"}
            sideOffset={4}
          >
            <DropdownMenuLabel className="text-muted-foreground text-xs">
              Site sections
            </DropdownMenuLabel>
            {sections.map((section, index) => (
              <SectionMenuItem
                key={section.id}
                section={section}
                index={index}
                isActive={section.id === active.id}
                onNavigate={() => setOpenMobile(false)}
              />
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  )
}

function SectionMenuItem({
  section,
  index,
  isActive,
  onNavigate,
}: {
  section: SectionSwitcherSection
  index: number
  isActive: boolean
  onNavigate: () => void
}) {
  const Icon = section.icon
  return (
    <DropdownMenuItem asChild className="gap-2 p-2 max-md:min-h-11">
      <Link href={section.href} onClick={onNavigate} aria-current={isActive ? "page" : undefined}>
        <div className="flex size-6 items-center justify-center rounded-md border">
          <Icon className="size-3.5 shrink-0" aria-hidden="true" />
        </div>
        <div className="grid flex-1 text-left text-sm leading-tight">
          <span className="font-medium">{section.name}</span>
          <span className="text-xs text-muted-foreground">{section.description}</span>
        </div>
        {index < 9 ? <DropdownMenuShortcut>⌘{index + 1}</DropdownMenuShortcut> : null}
      </Link>
    </DropdownMenuItem>
  )
}
