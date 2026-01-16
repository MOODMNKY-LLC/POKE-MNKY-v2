"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { Dock, DockIcon } from "@/components/ui/dock"
import {
  Trophy,
  Users,
  Calendar,
  Swords,
  BookOpen,
  Sparkles,
  Home,
} from "lucide-react"
import { cn } from "@/lib/utils"

/**
 * Dock Navigation Component
 * Replicates the main site navigation for dashboard pages
 * Provides quick access to public routes while in the dashboard
 */
export function DashboardDock() {
  const pathname = usePathname()

  const navItems = [
    {
      label: "Home",
      href: "/",
      icon: Home,
    },
    {
      label: "Standings",
      href: "/standings",
      icon: Trophy,
    },
    {
      label: "Teams",
      href: "/teams",
      icon: Users,
    },
    {
      label: "Schedule",
      href: "/schedule",
      icon: Calendar,
    },
    {
      label: "Showdown",
      href: "/showdown",
      icon: Swords,
    },
    {
      label: "Pokédex",
      href: "/pokedex",
      icon: BookOpen,
    },
    {
      label: "Insights",
      href: "/insights",
      icon: Sparkles,
    },
  ]

  return (
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 pointer-events-none">
      <Dock className="shadow-lg pointer-events-auto">
        {navItems.map((item) => {
          const isActive = pathname === item.href || pathname?.startsWith(item.href + "/")
          const Icon = item.icon

          return (
            <DockIcon
              key={item.href}
              className={cn(
                "transition-colors",
                isActive && "bg-primary/20"
              )}
            >
              <Link
                href={item.href}
                className="flex flex-col items-center justify-center gap-1 h-full w-full"
                title={item.label}
              >
                <Icon className="h-5 w-5" />
                <span className="text-[10px] font-medium leading-none">
                  {item.label}
                </span>
              </Link>
            </DockIcon>
          )
        })}
      </Dock>
    </div>
  )
}
