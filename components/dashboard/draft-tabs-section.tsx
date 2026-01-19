"use client"

import { useState, useEffect } from "react"
import { usePathname, useRouter } from "next/navigation"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { DraftPlanningSection } from "@/components/dashboard/draft-planning-section"
import { DraftBoardSection } from "@/components/dashboard/draft-board-section"
import { DraftRosterSection } from "@/components/dashboard/draft-roster-section"
import { ClipboardList, LayoutGrid, Users } from "lucide-react"
import { Skeleton } from "@/components/ui/skeleton"

export function DraftTabsSection() {
  const pathname = usePathname()
  const router = useRouter()
  const [mounted, setMounted] = useState(false)
  
  // Determine active tab from pathname
  const getActiveTabFromPath = (currentPathname: string | null) => {
    if (currentPathname?.includes("/draft/board")) return "board"
    if (currentPathname?.includes("/draft/roster")) return "roster"
    return "planning"
  }

  // Only set initial state after mount to avoid hydration mismatch
  const [activeTab, setActiveTab] = useState("planning")

  // Set mounted flag and initial tab after hydration
  useEffect(() => {
    setMounted(true)
    setActiveTab(getActiveTabFromPath(pathname))
  }, []) // Only run once on mount

  // Sync tab with pathname changes (but only if mounted)
  useEffect(() => {
    if (mounted) {
      const newTab = getActiveTabFromPath(pathname)
      if (newTab !== activeTab) {
        setActiveTab(newTab)
      }
    }
  }, [pathname, mounted, activeTab])

  const handleTabChange = (value: string) => {
    setActiveTab(value)
    // Navigate to appropriate route
    if (value === "board") {
      router.push("/dashboard/draft/board")
    } else if (value === "roster") {
      router.push("/dashboard/draft/roster")
    } else {
      router.push("/dashboard/draft")
    }
  }

  // Prevent hydration mismatch by not rendering Tabs until mounted
  // Radix UI generates random IDs that differ between server and client
  if (!mounted) {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Draft</h2>
          <p className="text-muted-foreground">
            Plan your draft, join live sessions, and manage your roster
          </p>
        </div>
        {/* Skeleton loader matching Tabs structure */}
        <div className="w-full">
          <div className="grid w-full grid-cols-3 gap-2 mb-6">
            <Skeleton className="h-10" />
            <Skeleton className="h-10" />
            <Skeleton className="h-10" />
          </div>
          <Skeleton className="h-96 w-full" />
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Draft</h2>
        <p className="text-muted-foreground">
          Plan your draft, join live sessions, and manage your roster
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="planning" className="gap-2">
            <ClipboardList className="h-4 w-4" />
            <span>Planning</span>
          </TabsTrigger>
          <TabsTrigger value="board" className="gap-2">
            <LayoutGrid className="h-4 w-4" />
            <span>Board</span>
          </TabsTrigger>
          <TabsTrigger value="roster" className="gap-2">
            <Users className="h-4 w-4" />
            <span>My Roster</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="planning" className="mt-6">
          <DraftPlanningSection />
        </TabsContent>

        <TabsContent value="board" className="mt-6">
          <DraftBoardSection />
        </TabsContent>

        <TabsContent value="roster" className="mt-6">
          <DraftRosterSection />
        </TabsContent>
      </Tabs>
    </div>
  )
}
