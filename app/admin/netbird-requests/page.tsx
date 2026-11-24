import Link from "next/link"
import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { getCurrentUserProfile, hasAdminOrCommissionerAccess } from "@/lib/rbac"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { NetbirdReviewActions } from "@/components/admin/netbird-review-actions"
import {
  NETBIRD_REQUEST_COLUMNS,
  NETBIRD_REQUEST_STATUSES,
  STATUS_LABELS,
  isNetbirdRequestStatus,
  type NetbirdAccessRequest,
} from "@/lib/netbird/access-requests"

export const dynamic = "force-dynamic"

const LOGIN_REDIRECT = "/auth/login?next=/admin/netbird-requests"
const FILTERS = [...NETBIRD_REQUEST_STATUSES, "all"] as const

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

  const { status: statusParam } = await searchParams
  const filter = statusParam === "all" || isNetbirdRequestStatus(statusParam) ? statusParam : "pending"

  let query = supabase
    .from("netbird_access_requests")
    .select(NETBIRD_REQUEST_COLUMNS)
    .order("created_at", { ascending: false })
    .limit(200)
  if (filter !== "all") query = query.eq("status", filter)

  const { data, error } = await query
  const rows = (data ?? []) as NetbirdAccessRequest[]

  return (
    <div className="flex max-w-4xl flex-col gap-4 p-4">
      <div>
        <h1 className="text-balance text-2xl font-bold tracking-tight">NetBird access requests</h1>
        <p className="text-sm text-muted-foreground">
          Review member requests. Approve, deny and invited only change the status here; they do not contact NetBird,
          Discord, or the member. Send invites from the NetBird dashboard yourself.
        </p>
      </div>

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
              Requested {new Date(row.created_at).toLocaleString()}
              {row.reviewed_at ? ` · Reviewed ${new Date(row.reviewed_at).toLocaleString()}` : ""}
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            {row.device_note ? <p className="text-sm text-muted-foreground">Device: {row.device_note}</p> : null}
            <NetbirdReviewActions id={row.id} status={row.status} />
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
