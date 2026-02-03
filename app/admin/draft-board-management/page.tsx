import { createServerClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { NotionIntegrationPanel } from "@/components/admin/draft-board/notion-integration-panel"
import { SyncStatus } from "@/components/admin/draft-board/sync-status"
import { AnalyticsDashboard } from "@/components/admin/draft-board/analytics-dashboard"
import { QuickEditPanel } from "@/components/admin/draft-board/quick-edit-panel"
import { WebhookStatus } from "@/components/admin/draft-board/webhook-status"
import { N8nStatus } from "@/components/admin/draft-board/n8n-status"
import { RealtimeStatus } from "@/components/admin/draft-board/realtime-status"

export default async function DraftBoardManagementPage() {
  const supabase = await createServerClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()

  if (authError || !user) {
    redirect("/auth/login")
  }

  // Check if user is admin (you may want to add role checking here)
  // For now, we'll allow any authenticated user

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Draft Board Management</h1>
        <p className="text-muted-foreground mt-2">
          Manage the draft pool through Notion integration with real-time sync to Supabase
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Left Column */}
        <div className="space-y-6">
          <NotionIntegrationPanel />
          <SyncStatus />
          <WebhookStatus />
        </div>

        {/* Right Column */}
        <div className="space-y-6">
          <AnalyticsDashboard />
          <QuickEditPanel />
          <N8nStatus />
          <RealtimeStatus />
        </div>
      </div>
    </div>
  )
}
