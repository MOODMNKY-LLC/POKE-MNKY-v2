/**
 * n8n Workflow Creation API
 *
 * POST /api/admin/n8n/create-workflow
 *
 * Creates a Notion sync workflow in n8n programmatically.
 */

import { NextRequest, NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase/server"
import { createNotionSyncWorkflow } from "@/lib/n8n/workflow-manager"

export async function POST(request: NextRequest) {
  try {
    // Verify admin authentication
    const supabase = await createServerClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const { webhook_url, sync_api_url, discord_webhook_url } = body

    // Get Discord webhook URL from database if not provided
    let discordUrl = discord_webhook_url
    if (!discordUrl) {
      const { data: webhook } = await supabase
        .from("discord_webhooks")
        .select("webhook_url")
        .eq("name", "draft_board_sync")
        .single()

      discordUrl = webhook?.webhook_url
    }

    // Create workflow
    const result = await createNotionSyncWorkflow(
      webhook_url,
      sync_api_url,
      discordUrl || undefined
    )

    // Store workflow ID in database (optional - for tracking)
    // You might want to create a n8n_workflows table for this

    return NextResponse.json({
      success: true,
      workflow_id: result.workflowId,
      webhook_url: result.webhookUrl,
      message: "Workflow created successfully. Activate it in n8n dashboard.",
    })
  } catch (error: any) {
    console.error("[n8n Workflow] Error:", error)
    return NextResponse.json(
      { error: error.message || "Failed to create n8n workflow" },
      { status: 500 }
    )
  }
}
