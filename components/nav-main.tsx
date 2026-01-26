"use client"

import * as React from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { ChevronRight, type LucideIcon } from "lucide-react"

import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import {
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
} from "@/components/ui/sidebar"

export function NavMain({
  items,
  onProfileClick,
}: {
  items: {
    title: string
    url: string
    icon?: LucideIcon
    isActive?: boolean
    items?: {
      title: string
      url: string
    }[]
  }[]
  onProfileClick?: () => void
}) {
  const pathname = usePathname()
  const [mounted, setMounted] = React.useState(false)

  const handleLinkClick = (e: React.MouseEvent<HTMLAnchorElement>, url: string) => {
    // Intercept profile links and open sheet instead
    if (url.startsWith("/dashboard/profile") && onProfileClick) {
      e.preventDefault()
      onProfileClick()
      return
    }
    // Otherwise, let the Link component handle navigation normally
  }

  React.useEffect(() => {
    setMounted(true)
  }, [])

  // Render simplified version on server (no Collapsible) to avoid hydration mismatch
  // Radix UI Collapsible generates random IDs that differ between server and client
  if (!mounted) {
    return (
      <SidebarGroup>
        <SidebarGroupLabel>Navigation</SidebarGroupLabel>
        <SidebarMenu>
            {items.map((item) => (
            <SidebarMenuItem key={item.title}>
              <SidebarMenuButton tooltip={item.title} asChild>
                <Link href={item.url} onClick={(e) => item.url.startsWith("/dashboard/profile") && onProfileClick ? (e.preventDefault(), onProfileClick()) : undefined}>
                  {item.icon && <item.icon />}
                  <span>{item.title}</span>
                </Link>
              </SidebarMenuButton>
              {item.items && item.items.length > 0 && (
                <SidebarMenuSub>
                  {item.items.map((subItem) => (
                    <SidebarMenuSubItem key={subItem.title}>
                      <SidebarMenuSubButton asChild>
                        <Link href={subItem.url} onClick={(e) => subItem.url.startsWith("/dashboard/profile") && onProfileClick ? (e.preventDefault(), onProfileClick()) : undefined}>
                          <span>{subItem.title}</span>
                        </Link>
                      </SidebarMenuSubButton>
                    </SidebarMenuSubItem>
                  ))}
                </SidebarMenuSub>
              )}
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
      </SidebarGroup>
    )
  }

  // Client-side rendering with pathname-based active states and collapsible functionality
  return (
    <SidebarGroup>
      <SidebarGroupLabel>Navigation</SidebarGroupLabel>
      <SidebarMenu>
        {items.map((item) => {
          const isActive = pathname === item.url || pathname?.startsWith(item.url + "/")
          const hasSubItems = item.items && item.items.length > 0

          // If no sub-items, render as simple link
          if (!hasSubItems) {
            return (
              <SidebarMenuItem key={item.title}>
                <SidebarMenuButton tooltip={item.title} asChild isActive={isActive}>
                  <Link href={item.url} onClick={(e) => handleLinkClick(e, item.url)}>
                    {item.icon && <item.icon />}
                    <span>{item.title}</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            )
          }

          // If has sub-items, render as collapsible
          // Prevent navigation on parent click - just toggle collapsible
          return (
            <Collapsible
              key={item.title}
              asChild
              defaultOpen={isActive || item.isActive || false}
              className="group/collapsible"
            >
              <SidebarMenuItem>
                <CollapsibleTrigger asChild suppressHydrationWarning>
                  <SidebarMenuButton tooltip={item.title} isActive={isActive}>
                    <div className="flex items-center w-full">
                      {item.icon && <item.icon />}
                      <span>{item.title}</span>
                      <ChevronRight className="ml-auto transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90" />
                    </div>
                  </SidebarMenuButton>
                </CollapsibleTrigger>
                <CollapsibleContent suppressHydrationWarning>
                  <SidebarMenuSub>
                    {item.items?.map((subItem) => {
                      const isSubActive = pathname === subItem.url
                      return (
                        <SidebarMenuSubItem key={subItem.title}>
                          <SidebarMenuSubButton asChild isActive={isSubActive}>
                            <Link href={subItem.url} onClick={(e) => handleLinkClick(e, subItem.url)}>
                              <span>{subItem.title}</span>
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
        })}
      </SidebarMenu>
    </SidebarGroup>
  )
}
