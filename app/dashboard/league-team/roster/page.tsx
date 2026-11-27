import { createClient } from "@/lib/supabase/server"
import { getCurrentUserProfile } from "@/lib/rbac"
import { redirect } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import Link from "next/link"
import { LeagueTeamRosterClient } from "@/components/dashboard/league-team-roster-client"

export const dynamic = "force-dynamic"

export default async function LeagueTeamRosterPage() {
  const supabase = await createClient()
  const {
    data: { user } } = await supabase.auth.getUser()

  if (!user) redirect("/auth/login")

  const profile = await getCurrentUserProfile(supabase)
  if (!profile) redirect("/auth/login")
  if (profile.role !== "coach" || !profile.team_id) redirect("/dashboard")

  const { data: season } = await supabase
    .from("seasons")
    .select("id, name")
    .eq("is_current", true)
    .single()

  const { data: matchweeks } = season
    ? await supabase
        .from("matchweeks")
        .select("week_number")
        .eq("season_id", season.id)
        .order("week_number", { ascending: true })
    : { data: [] as { week_number: number }[] }

  const weeks = matchweeks?.map((w) => w.week_number) ?? [1]

  return (
    <>
      <div className="flex flex-1 flex-col gap-4 p-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Roster by week</h1>
          <p className="text-muted-foreground text-sm">
            Weekly roster snapshot. The current week is locked; trades and free agency apply at 12:00 AM Monday EST and update future weeks.
          </p>
        </div>
        {season && (
          <LeagueTeamRosterClient
            teamId={profile.team_id}
            seasonId={season.id}
            seasonName={season.name ?? ""}
            weeks={weeks.length > 0 ? weeks : [1]}
          />
        )}
      </div>
    </>
  )
}
