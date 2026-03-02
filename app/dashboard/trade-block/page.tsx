"use client"

import { useState, useEffect } from "react"
import { createBrowserClient } from "@/lib/supabase/client"
import { useRouter } from "next/navigation"
import Link from "next/link"
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbLink,
} from "@/components/ui/breadcrumb"
import { SidebarTrigger } from "@/components/ui/sidebar"
import { Separator } from "@/components/ui/separator"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { TradeBlockSection } from "@/components/dashboard/trade-block-section"
import { LeagueTradeBlockList } from "@/components/dashboard/league-trade-block-list"
import { RefreshCw } from "lucide-react"
import { canAccessCoachFeatures } from "@/lib/rbac"

export default function TradeBlockPage() {
  const router = useRouter()
  const [profile, setProfile] = useState<{ team_id: string; team_name?: string } | null>(null)
  const [seasonId, setSeasonId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const supabase = createBrowserClient()
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) {
        router.push("/auth/login")
        return
      }
      const { data: profileData } = await supabase
        .from("profiles")
        .select("role, team_id")
        .eq("id", user.id)
        .single()
      if (canAccessCoachFeatures(profileData)) {
        const { data: team } = await supabase
          .from("teams")
          .select("id, name")
          .eq("id", profileData.team_id)
          .single()
        setProfile({
          team_id: profileData.team_id,
          team_name: team?.name ?? undefined,
        })
      }
      const { data: season } = await supabase
        .from("seasons")
        .select("id")
        .eq("is_current", true)
        .single()
      setSeasonId(season?.id ?? null)
      setLoading(false)
    }
    load()
  }, [router])

  if (loading) {
    return (
      <>
        <header className="flex h-16 shrink-0 items-center gap-2 border-b px-4">
          <SidebarTrigger className="-ml-1" />
          <Separator orientation="vertical" className="mr-2 h-4" />
          <Breadcrumb>
            <BreadcrumbList>
              <BreadcrumbItem>
                <BreadcrumbLink asChild>
                  <Link href="/dashboard">Dashboard</Link>
                </BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbItem>
                <BreadcrumbPage>Trade Block</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
        </header>
        <div className="flex flex-1 flex-col gap-4 p-4">
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
      </>
    )
  }

  return (
    <>
      <header className="flex h-16 shrink-0 items-center gap-2 border-b px-4">
        <SidebarTrigger className="-ml-1" />
        <Separator orientation="vertical" className="mr-2 h-4" />
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink asChild>
                <Link href="/dashboard">Dashboard</Link>
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbItem>
              <BreadcrumbPage>Trade Block</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
      </header>
      <div className="flex flex-1 flex-col gap-6 p-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Trade Block</h1>
          <p className="text-muted-foreground text-sm">
            Manage your trade block and view league-wide listings. Trades execute at 12:00 AM Monday EST.
          </p>
        </div>

        {profile && (
          <TradeBlockSection
            teamId={profile.team_id}
            teamName={profile.team_name}
            seasonId={seasonId}
          />
        )}

        <Card>
          <CardHeader>
            <CardTitle>League Trade Block</CardTitle>
            <CardDescription>
              Pokemon other coaches have listed. Use &quot;Trade&quot; to make an offer (up to 3 per side).
            </CardDescription>
          </CardHeader>
          <CardContent>
            <LeagueTradeBlockList
              seasonId={seasonId}
              myTeamId={profile?.team_id ?? null}
            />
          </CardContent>
        </Card>
      </div>
    </>
  )
}
