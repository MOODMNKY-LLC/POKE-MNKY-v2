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

      {/* How to populate the draft pool */}
      <div className="rounded-lg border bg-muted/50 p-4 text-sm">
        <h2 className="font-semibold mb-2">How to populate the draft pool</h2>
        <ol className="list-decimal list-inside space-y-1.5 text-muted-foreground">
          <li>
            <strong className="text-foreground">Curate the list in Notion</strong> — Use the Master Draft Board and set &quot;Added to Draft Board&quot; for each Pokémon you want in the pool.
          </li>
          <li>
            <strong className="text-foreground">Run the n8n seed once per season</strong> — When the pool is empty or you need a full refresh, run the <strong>Draft Pool Seed (Notion → Supabase)</strong> workflow in n8n. See <code className="rounded bg-muted px-1">docs/N8N-DRAFT-POOL-SEED-AND-UPSERT.md</code> for details.
          </li>
          <li>
            <strong className="text-foreground">Ongoing changes</strong> — Edits in Notion are synced to Supabase by the n8n <strong>Notion Draft Board → Supabase Sync</strong> workflow (webhook or scheduled).
          </li>
        </ol>
        <p className="mt-2 text-xs text-muted-foreground">
          Quick Edit Panel below writes only to Supabase; changes are not synced back to Notion.
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
