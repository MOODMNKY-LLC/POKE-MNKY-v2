import { createClient } from "@/lib/supabase/server"
import { getCurrentUserProfile } from "@/lib/rbac"
import { redirect } from "next/navigation"
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
import Link from "next/link"
import { History } from "lucide-react"
import { formatDistanceToNow } from "date-fns"

export const dynamic = "force-dynamic"

const ACTION_LABELS: Record<string, string> = {
  onboarding_completed: "Completed coach onboarding",
  team_created: "Saved a team",
  match_submitted: "Submitted match result",
  profile_updated: "Updated profile",
  trade_block_updated: "Updated trade block",
  free_agency_request_created: "Created free agency request",
}

export default async function DashboardActivityPage() {
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

  const { data: activities } = await supabase
    .from("user_activity_log")
    .select("id, action, resource_type, resource_id, metadata, created_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(20)

  const activityItems = (activities ?? []).map((item) => ({
    ...item,
    label:
      ACTION_LABELS[item.action] ??
      item.action
        .split("_")
        .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
        .join(" "),
  }))

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
              <BreadcrumbPage>Activity</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
      </header>
      <div className="flex flex-1 flex-col gap-4 p-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Recent Activity</h1>
          <p className="text-muted-foreground text-sm">Your recent actions and league updates</p>
        </div>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <History className="h-5 w-5" />
              Activity
            </CardTitle>
            <CardDescription>Activity tracking is backed by your league actions and updates in Supabase.</CardDescription>
          </CardHeader>
          <CardContent>
            {activityItems.length > 0 ? (
              <ul className="space-y-3">
                {activityItems.map((item) => (
                  <li key={item.id} className="rounded-lg border border-border/60 bg-muted/20 p-3">
                    <div className="flex items-start justify-between gap-4">
                      <div className="space-y-1">
                        <p className="font-medium">{item.label}</p>
                        <p className="text-sm text-muted-foreground">
                          {item.resource_type ? `${item.resource_type.replace(/_/g, " ")} · ` : ""}
                          {item.metadata && typeof item.metadata === "object" && "name" in item.metadata
                            ? String((item.metadata as Record<string, unknown>).name)
                            : "League activity"}
                        </p>
                      </div>
                      <p className="text-xs text-muted-foreground whitespace-nowrap">
                        {formatDistanceToNow(new Date(item.created_at), { addSuffix: true })}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-muted-foreground">No recent activity yet. New actions will appear here as you use the app.</p>
            )}
            <Link href="/dashboard" className="mt-2 inline-block text-sm text-primary hover:underline">
              Back to Dashboard
            </Link>
          </CardContent>
        </Card>
      </div>
    </>
  )
}
