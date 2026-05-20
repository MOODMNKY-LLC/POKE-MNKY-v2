import { createServerClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { NotionIntegrationPanel } from "@/components/admin/draft-board/notion-integration-panel"
import { SyncStatus } from "@/components/admin/draft-board/sync-status"
import { DraftBoardAnalysisCard } from "@/components/admin/draft-board/draft-board-analysis-card"
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
          Monitor the live board and use advanced overrides. Primary pool workflow is in-app.
        </p>
      </div>

      {/* How to populate the draft pool */}
      <div className="rounded-lg border bg-muted/50 p-4 text-sm">
        <h2 className="font-semibold mb-2">Recommended: in-app pool workflow</h2>
        <ol className="list-decimal list-inside space-y-1.5 text-muted-foreground">
          <li>
            <strong className="text-foreground">Draft Pool Rules</strong> — Generate season pool, then Publish to draft
            board (<code className="rounded bg-muted px-1">/admin/draft-pool-rules</code>).
          </li>
          <li>
            <strong className="text-foreground">Create draft session</strong> — Wizard auto-publishes when generating or
            loading a pool. See <code className="rounded bg-muted px-1">docs/DRAFT-IN-APP-OPERATIONS.md</code>.
          </li>
          <li>
            <strong className="text-foreground">Coaches draft</strong> —{" "}
            <code className="rounded bg-muted px-1">/dashboard/draft/board</code> via pick-by-name API.
          </li>
        </ol>
        <p className="mt-2 text-xs text-muted-foreground">
          Notion/n8n panels below are legacy only. Quick Edit writes directly to draft_pool (advanced).
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Left Column */}
        <div className="space-y-6">
          <NotionIntegrationPanel />
          <SyncStatus />
          <DraftBoardAnalysisCard />
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
