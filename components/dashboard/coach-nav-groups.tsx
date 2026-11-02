"use client"

import * as React from "react"
import Link from "next/link"
import { ChevronRight, Lock } from "lucide-react"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuAction,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  useSidebar,
} from "@/components/ui/sidebar"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { openProfileSheet } from "@/components/profile/profile-sheet-trigger"
import {
  getVisibleGroups,
  type CoachNavContext,
  type CoachNavGroup,
  type CoachNavItem,
  type NavEntry,
} from "@/lib/nav/coach-nav"
import { useNavLocation } from "@/components/dashboard/use-nav-location"

const TOUCH_TARGET = "max-md:h-11 max-md:text-base"

function NavItem({ item, active }: { item: CoachNavItem; active: NavEntry | null }) {
  const { setOpenMobile } = useSidebar()
  const closeMobile = () => setOpenMobile(false)
  const Icon = item.icon
  const itemActive = active?.itemId === item.id
  const activeChildId = active?.kind === "child" ? active.id : null
  const hasChildren = Boolean(item.children?.length)
  const [subOpen, setSubOpen] = React.useState(itemActive)

  React.useEffect(() => {
    if (itemActive) setSubOpen(true)
  }, [itemActive])

  if (item.disabled) {
    return (
      <SidebarMenuItem>
        <Tooltip>
          <TooltipTrigger asChild>
            <SidebarMenuButton
              asChild
              className={`${TOUCH_TARGET} cursor-not-allowed opacity-60 hover:bg-transparent hover:text-sidebar-foreground`}
            >
              <span role="link" aria-disabled="true" tabIndex={0}>
                <Icon />
                <span>{item.title}</span>
                <Lock className="ml-auto size-3.5 shrink-0" aria-hidden="true" />
              </span>
            </SidebarMenuButton>
          </TooltipTrigger>
          <TooltipContent side="right" className="max-w-56">
            {item.title}: {item.disabled.reason}
          </TooltipContent>
        </Tooltip>
      </SidebarMenuItem>
    )
  }

  if (item.action === "open-profile-sheet") {
    return (
      <SidebarMenuItem>
        <SidebarMenuButton
          tooltip={item.title}
          isActive={itemActive}
          className={TOUCH_TARGET}
          onClick={() => {
            closeMobile()
            openProfileSheet()
          }}
        >
          <Icon />
          <span>{item.title}</span>
        </SidebarMenuButton>
      </SidebarMenuItem>
    )
  }

  const link = (
    <SidebarMenuButton
      asChild
      tooltip={item.title}
      isActive={itemActive && active?.kind !== "child"}
      className={TOUCH_TARGET}
    >
      <Link
        href={item.href}
        aria-current={itemActive && active?.kind !== "child" ? "page" : undefined}
        onClick={closeMobile}
      >
        <Icon />
        <span>{item.title}</span>
      </Link>
    </SidebarMenuButton>
  )

  if (!hasChildren) return <SidebarMenuItem>{link}</SidebarMenuItem>

  return (
    <Collapsible open={subOpen} onOpenChange={setSubOpen} asChild>
      <SidebarMenuItem>
        {link}
        <CollapsibleTrigger asChild>
          <SidebarMenuAction
            className="data-[state=open]:rotate-90 max-md:size-8 max-md:top-1.5"
            aria-label={`${subOpen ? "Collapse" : "Expand"} ${item.title}`}
          >
            <ChevronRight />
          </SidebarMenuAction>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <SidebarMenuSub>
            {item.children!.map((child) => {
              const childActive = activeChildId === child.id
              return (
                <SidebarMenuSubItem key={child.id}>
                  <SidebarMenuSubButton asChild isActive={childActive} className="max-md:h-11 max-md:text-base">
                    <Link
                      href={child.href}
                      aria-current={childActive ? "page" : undefined}
                      onClick={closeMobile}
                    >
                      <span>{child.title}</span>
                    </Link>
                  </SidebarMenuSubButton>
                </SidebarMenuSubItem>
              )
            })}
          </SidebarMenuSub>
        </CollapsibleContent>
      </SidebarMenuItem>
    </Collapsible>
  )
}

function NavGroup({
  group,
  ctx,
  active,
}: {
  group: CoachNavGroup
  ctx: CoachNavContext
  active: NavEntry | null
}) {
  const { state, isMobile } = useSidebar()
  const containsActive = active?.groupId === group.id
  const startsOpen = containsActive || (group.defaultOpen ? group.defaultOpen(ctx) : true)
  const [open, setOpen] = React.useState(startsOpen)

  React.useEffect(() => {
    if (containsActive) setOpen(true)
  }, [containsActive])

  // In icon mode the labels are hidden, so the icons must always stay reachable.
  const iconRail = state === "collapsed" && !isMobile
  const labelId = `coach-nav-${group.id}`

  return (
    <Collapsible open={open || iconRail} onOpenChange={setOpen} asChild>
      <SidebarGroup aria-labelledby={labelId}>
        <SidebarGroupLabel asChild>
          <CollapsibleTrigger id={labelId} className="group/label w-full max-md:h-11 max-md:text-sm">
            {group.label}
            <ChevronRight className="ml-auto transition-transform group-data-[state=open]/label:rotate-90" />
          </CollapsibleTrigger>
        </SidebarGroupLabel>
        <CollapsibleContent>
          <SidebarGroupContent>
            <SidebarMenu>
              {group.items.map((item) => (
                <NavItem key={item.id} item={item} active={active} />
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </CollapsibleContent>
      </SidebarGroup>
    </Collapsible>
  )
}

export function CoachNavGroups({ ctx }: { ctx: CoachNavContext }) {
  const { active } = useNavLocation()
  const groups = getVisibleGroups(ctx)
  return (
    <nav aria-label="Coach dashboard" className="flex flex-col">
      {groups.map((group) => (
        <NavGroup key={group.id} group={group} ctx={ctx} active={active} />
      ))}
    </nav>
  )
}
