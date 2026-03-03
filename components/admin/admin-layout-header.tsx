"use client"

import { useState, useEffect } from "react"
import { createBrowserClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { Settings } from "lucide-react"
import { SidebarTrigger } from "@/components/ui/sidebar"
import { SupabaseManager } from "@/components/platform/supabase-manager"

export function AdminLayoutHeader() {
  const [user, setUser] = useState<{ email?: string } | null>(null)
  const [platformOpen, setPlatformOpen] = useState(false)

  useEffect(() => {
    const supabase = createBrowserClient()
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) setUser(data.user)
    })
  }, [])

  return (
    <header className="flex h-14 shrink-0 items-center justify-between gap-2 border-b border-border px-4">
      <div className="flex items-center gap-2">
        <SidebarTrigger className="-ml-1" />
        <span className="text-sm font-medium text-muted-foreground">
          Admin Backoffice
        </span>
        {user?.email && (
          <span className="hidden sm:inline text-xs text-muted-foreground truncate max-w-[180px]">
            {user.email}
          </span>
        )}
      </div>
      <div className="flex items-center gap-2">
        <Button onClick={() => setPlatformOpen(true)} variant="outline" size="sm">
          <Settings className="h-4 w-4 mr-2" />
          Platform Manager
        </Button>
        <Button asChild variant="outline" size="sm">
          <Link href="/">View Site</Link>
        </Button>
      </div>
      <SupabaseManager
        projectRef={process.env.NEXT_PUBLIC_SUPABASE_URL?.split("//")[1]?.split(".")[0] || "default"}
        open={platformOpen}
        onOpenChange={setPlatformOpen}
      />
    </header>
  )
}
