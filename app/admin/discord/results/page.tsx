import { redirect } from "next/navigation"
import { AdminLayout } from "@/components/admin/admin-layout"
import { requireLeagueAdmin } from "@/lib/admin-api-auth"
import { createServiceRoleClient } from "@/lib/supabase/service"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

export default async function DiscordResultsAdminPage() {
  const admin = await requireLeagueAdmin()
  if ("response" in admin) redirect("/auth/login")

  let flags: Array<{ id: string; flag: string; severity: string }> = []
  try {
    const supabase = createServiceRoleClient()
    const { data } = await supabase
      .from("discord_reconciliation_flags")
      .select("id, flag, severity")
      .is("resolved_at", null)
      .order("first_seen_at", { ascending: false })
      .limit(50)
    flags = (data ?? []) as typeof flags
  } catch {
    flags = []
  }

  return (
    <AdminLayout
      title="Discord result flags"
      description="Read-only comparison of battle-channel posts with the sheet. Nothing here writes a match."
    >
      <Card>
        <CardHeader>
          <CardTitle>Open flags</CardTitle>
          <CardDescription>
            The poll runs daily at 06:20 UTC. The mod-channel post stays off until DISCORD_MOD_DIGEST_ENABLED is set.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {flags.length === 0 ? (
            <p className="text-sm text-muted-foreground">No open flags. The cron stores them and does not change matches, rosters, or team records.</p>
          ) : (
            <ul className="space-y-2 text-sm">
              {flags.map((flag) => (
                <li key={flag.id}>
                  <span className="font-medium">{flag.flag}</span>
                  <span className="text-muted-foreground"> · {flag.severity}</span>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </AdminLayout>
  )
}
