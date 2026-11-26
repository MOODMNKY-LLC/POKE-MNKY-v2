import Link from "next/link"
import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { getCurrentUserProfile, hasAdminOrCommissionerAccess } from "@/lib/rbac"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { NetbirdReviewActions } from "@/components/admin/netbird-review-actions"
import {
  NETBIRD_ADMIN_REQUEST_COLUMNS,
  NETBIRD_REQUEST_STATUSES,
  STATUS_LABELS,
  isNetbirdRequestStatus,
  type NetbirdAdminAccessRequest,
} from "@/lib/netbird/access-requests"
import { expireStaleInvites, isOnboardingEnabled } from "@/lib/netbird/automation"
import { describeEvent, formatDateTime } from "@/lib/netbird/events"

export const dynamic = "force-dynamic"

const LOGIN_REDIRECT = "/auth/login?next=/admin/netbird-requests"
const FILTERS = [...NETBIRD_REQUEST_STATUSES, "all"] as const
const SOURCE_LABELS = { app: "App", discord: "Discord" } as const
const DECISION_LABELS = { auto_coach: "Coach - automatic", admin: "Admin" } as const

interface ActivityRow {
  id: string
  action: string
  created_at: string
  netbird_access_requests: { display_name: string | null } | { display_name: string | null }[] | null
}

function activityName(row: ActivityRow): string {
  const related = Array.isArray(row.netbird_access_requests) ? row.netbird_access_requests[0] : row.netbird_access_requests
  return related?.display_name ?? "A member"
}

export default async function AdminNetbirdRequestsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>
}) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect(LOGIN_REDIRECT)

  const profile = await getCurrentUserProfile(supabase)
  if (!profile) redirect(LOGIN_REDIRECT)
  if (!hasAdminOrCommissionerAccess(profile)) redirect("/admin")

  await expireStaleInvites()
  const onboardingEnabled = isOnboardingEnabled()

  const { status: statusParam } = await searchParams
  const filter = statusParam === "all" || isNetbirdRequestStatus(statusParam) ? statusParam : "pending"

  let query = supabase
    .from("netbird_access_requests")
    .select(NETBIRD_ADMIN_REQUEST_COLUMNS)
    .order("created_at", { ascending: false })
    .limit(200)
  if (filter !== "all") query = query.eq("status", filter)

  const { data, error } = await query
  const rows = (data ?? []) as unknown as NetbirdAdminAccessRequest[]

  const { data: activityData, error: activityError } = await supabase
    .from("netbird_onboarding_events")
    .select("id, action, created_at, netbird_access_requests(display_name)")
    .neq("action", "request_attempt")
    .order("created_at", { ascending: false })
    .limit(25)
  const activity = (activityData ?? []) as unknown as ActivityRow[]

  return (
    <div className="flex max-w-4xl flex-col gap-4 p-4">
      <div>
        <h1 className="text-balance text-2xl font-bold tracking-tight">NetBird access requests</h1>
        <p className="text-sm text-muted-foreground">
          Current league coaches are approved automatically. Approving a request here creates the NetBird invite and
          sends it to the member.
        </p>
      </div>

      {!onboardingEnabled ? (
        <Alert>
          <AlertTitle>Onboarding is paused</AlertTitle>
          <AlertDescription>
            Onboarding is paused; approvals are saved but no invites are sent. Use Send again after it is switched
            back on.
          </AlertDescription>
        </Alert>
      ) : null}

      <nav aria-label="Filter by status" className="flex flex-wrap gap-2">
        {FILTERS.map((value) => (
          <Button key={value} asChild size="sm" variant={filter === value ? "default" : "outline"}>
            <Link href={`/admin/netbird-requests?status=${value}`}>
              {value === "all" ? "All" : STATUS_LABELS[value]}
            </Link>
          </Button>
        ))}
      </nav>

      {error ? (
        <p className="text-sm text-destructive" role="alert">
          Could not load requests: {error.message}
        </p>
      ) : null}

      {!error && rows.length === 0 ? <p className="text-sm text-muted-foreground">No requests found.</p> : null}

      {rows.map((row) => (
        <Card key={row.id}>
          <CardHeader>
            <CardTitle className="flex flex-wrap items-center gap-2 text-base">
              {row.display_name ?? "Unnamed member"}
              <Badge variant="secondary">{STATUS_LABELS[row.status]}</Badge>
              {row.role ? <Badge variant="outline">{row.role}</Badge> : null}
            </CardTitle>
            <CardDescription>
              {row.discord_username ? `Discord: ${row.discord_username} · ` : ""}
              Created {formatDateTime(row.created_at)} · Updated {formatDateTime(row.updated_at)}
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            <dl className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm sm:grid-cols-3">
              <div>
                <dt className="text-xs text-muted-foreground">Source</dt>
                <dd>{SOURCE_LABELS[row.source] ?? row.source}</dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground">Decision</dt>
                <dd>{row.decision ? DECISION_LABELS[row.decision] : "Not decided yet"}</dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground">Status</dt>
                <dd>{STATUS_LABELS[row.status]}</dd>
              </div>
            </dl>
            {row.device_note ? <p className="text-sm text-muted-foreground">Device: {row.device_note}</p> : null}
            {row.last_error ? (
              <p className="text-sm text-destructive">
                Last problem: {row.last_error} (attempt {row.attempt_count})
              </p>
            ) : null}
            <NetbirdReviewActions id={row.id} status={row.status} paused={!onboardingEnabled} />
          </CardContent>
        </Card>
      ))}

      <section aria-labelledby="recent-activity" className="flex flex-col gap-2">
        <h2 id="recent-activity" className="text-lg font-semibold tracking-tight">
          Recent activity
        </h2>
        {activityError ? (
          <p className="text-sm text-muted-foreground">Recent activity could not be loaded.</p>
        ) : activity.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nothing yet.</p>
        ) : (
          <ul className="divide-y rounded-md border text-sm">
            {activity.map((event) => (
              <li key={event.id} className="flex flex-col gap-1 px-3 py-2 sm:flex-row sm:justify-between">
                <span>
                  <span className="font-medium">{activityName(event)}</span> {describeEvent(event.action)}
                </span>
                <time dateTime={event.created_at} className="text-xs text-muted-foreground">
                  {formatDateTime(event.created_at)}
                </time>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}
