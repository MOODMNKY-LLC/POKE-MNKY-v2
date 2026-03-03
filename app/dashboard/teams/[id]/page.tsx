import { createClient } from "@/lib/supabase/server"
import { createServiceRoleClient } from "@/lib/supabase/service"
import { getTeamById } from "@/lib/showdown-teams"
import { getCurrentUserProfile } from "@/lib/rbac"
import { redirect, notFound } from "next/navigation"
import {
  SidebarTrigger,
} from "@/components/ui/sidebar"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { ArrowLeft } from "lucide-react"
import Link from "next/link"
import { TeamDisplayShowdownClient } from "@/components/showdown/team-detail-display-client"
import { ShowdownTeamDetailHeader } from "@/components/teams/showdown-team-detail-header"

export const dynamic = "force-dynamic"

export default async function DashboardTeamDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params

  // Reject non-UUID segments so routes like /dashboard/teams/upload don't hit the DB (invalid uuid)
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
  if (!id || !uuidRegex.test(id)) {
    notFound()
  }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/auth/login")
  }

  const profile = await getCurrentUserProfile(supabase)
  if (!profile) {
    redirect("/auth/login")
  }

  const team = await getTeamById(id)
  if (!team) {
    notFound()
  }

  const serviceSupabase = createServiceRoleClient()
  const { data: coach } = await serviceSupabase
    .from("coaches")
    .select("id")
    .eq("user_id", user.id)
    .single()

  const isOwner = team.coach_id === coach?.id
  const isStock = team.is_stock === true
  if (!isOwner && !isStock) {
    notFound()
  }

  return (
    <>
      <header className="flex h-16 shrink-0 items-center gap-2 border-b px-4">
        <SidebarTrigger className="-ml-1" />
        <div className="flex items-center gap-2">
          <h1 className="text-lg font-semibold">{team.team_name}</h1>
        </div>
      </header>
      <div className="flex flex-1 flex-col gap-4 p-4 md:p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <Button asChild variant="ghost" size="sm">
            <Link href="/dashboard/teams/library">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Team Library
            </Link>
          </Button>
          <div className="flex flex-wrap gap-2">
            {team.format && (
              <Badge variant="outline">{team.format.toUpperCase()}</Badge>
            )}
            {team.generation && (
              <Badge variant="outline">Gen {team.generation}</Badge>
            )}
            {isStock && (
              <Badge variant="secondary">Stock team</Badge>
            )}
          </div>
        </div>

        <ShowdownTeamDetailHeader
          team={{
            id: team.id,
            team_name: team.team_name,
            format: team.format,
            generation: team.generation,
            folder_path: team.folder_path,
            avatar_url: team.avatar_url,
          }}
          isOwner={isOwner}
        />
        <Card>
          <CardContent className="pt-6">
            <TeamDisplayShowdownClient
              team={{
                id: team.id,
                team_name: team.team_name,
                format: team.format,
                generation: team.generation,
                canonical_text: team.canonical_text,
                team_text: team.team_text,
                pokemon_data: team.pokemon_data ?? [],
              }}
              isStock={isStock}
            />
          </CardContent>
        </Card>
      </div>
    </>
  )
}
