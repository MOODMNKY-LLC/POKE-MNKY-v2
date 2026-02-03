/**
 * Notion Webhook Subscription Management API
 *
 * POST /api/admin/notion/webhook-subscription - Create subscription
 * GET /api/admin/notion/webhook-subscription - List subscriptions
 * DELETE /api/admin/notion/webhook-subscription - Delete subscription
 */

import { NextRequest, NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase/server"
import {
  createNotionWebhookSubscription,
  listNotionWebhookSubscriptions,
  deleteNotionWebhookSubscription,
  getN8nWebhookUrl,
  getDirectWebhookUrl,
} from "@/lib/notion/webhook-subscription"

const DRAFT_BOARD_DATABASE_ID = "5e58ccd73ceb44ed83de826b51cf5c36"

export async function POST(request: NextRequest) {
  try {
    // Verify admin authentication
    const supabase = await createServerClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const { database_id, webhook_url, events, use_n8n = true } = body

    const targetDatabaseId = database_id || DRAFT_BOARD_DATABASE_ID
    const targetWebhookUrl = webhook_url || (use_n8n ? getN8nWebhookUrl() : getDirectWebhookUrl())
    const targetEvents = events || ["database.content_updated", "page.properties_updated"]

    // Create subscription via Notion API
    let subscriptionId: string
    try {
      const result = await createNotionWebhookSubscription(
        targetDatabaseId,
        targetWebhookUrl,
        targetEvents
      )
      subscriptionId = result.subscription_id
    } catch (error: any) {
      // If Notion subscriptions API is not available, return instructions
      if (error.code === "SUBSCRIPTIONS_API_NOT_AVAILABLE") {
        return NextResponse.json(
          {
            error: "Notion webhook subscriptions API not available",
            message: "Use Notion database automations instead. See documentation for setup instructions.",
            alternative: {
              type: "database_automation",
              database_id: targetDatabaseId,
              webhook_url: targetWebhookUrl,
              events: targetEvents,
            },
          },
          { status: 501 }
        )
      }
      throw error
    }

    // Store subscription in database
    const { data: subscription, error: dbError } = await supabase
      .from("notion_webhook_subscriptions")
      .insert({
        subscription_id: subscriptionId,
        database_id: targetDatabaseId,
        webhook_url: targetWebhookUrl,
        events: targetEvents,
        active: true,
      })
      .select()
      .single()

    if (dbError) {
      console.error("[Webhook Subscription] Database error:", dbError)
      // Subscription created in Notion but failed to store - still return success
      // but log the error
    }

    return NextResponse.json({
      success: true,
      subscription: subscription || {
        subscription_id: subscriptionId,
        database_id: targetDatabaseId,
        webhook_url: targetWebhookUrl,
        events: targetEvents,
      },
    })
  } catch (error: any) {
    console.error("[Webhook Subscription] Error:", error)
    return NextResponse.json(
      { error: error.message || "Failed to create webhook subscription" },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  try {
    // Verify admin authentication
    const supabase = await createServerClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Get subscriptions from database
    const { data: dbSubscriptions, error: dbError } = await supabase
      .from("notion_webhook_subscriptions")
      .select("*")
      .eq("active", true)
      .order("created_at", { ascending: false })

    if (dbError) {
      console.error("[Webhook Subscription] Database error:", dbError)
    }

    // Also try to fetch from Notion API (if available)
    let notionSubscriptions: any[] = []
    try {
      notionSubscriptions = await listNotionWebhookSubscriptions()
    } catch (error: any) {
      // API not available - that's okay, we'll use database records
      console.log("[Webhook Subscription] Notion API not available, using database records only")
    }

    // Merge results (prefer database records as source of truth)
    const subscriptions = (dbSubscriptions || []).map((dbSub) => {
      const notionSub = notionSubscriptions.find(
        (ns) => ns.subscription_id === dbSub.subscription_id
      )
      return {
        ...dbSub,
        // Update with any Notion API data if available
        ...(notionSub && { active: notionSub.active }),
      }
    })

    return NextResponse.json({
      success: true,
      subscriptions,
      count: subscriptions.length,
    })
  } catch (error: any) {
    console.error("[Webhook Subscription] Error:", error)
    return NextResponse.json(
      { error: error.message || "Failed to list webhook subscriptions" },
      { status: 500 }
    )
  }
}

export async function DELETE(request: NextRequest) {
  try {
    // Verify admin authentication
    const supabase = await createServerClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const subscriptionId = searchParams.get("subscription_id")

    if (!subscriptionId) {
      return NextResponse.json(
        { error: "subscription_id query parameter required" },
        { status: 400 }
      )
    }

    // Delete from Notion API (if available)
    try {
      await deleteNotionWebhookSubscription(subscriptionId)
    } catch (error: any) {
      // API not available - that's okay, we'll just mark as inactive in database
      console.log("[Webhook Subscription] Notion API not available, marking inactive in database")
    }

    // Mark as inactive in database
    const { error: dbError } = await supabase
      .from("notion_webhook_subscriptions")
      .update({ active: false })
      .eq("subscription_id", subscriptionId)

    if (dbError) {
      console.error("[Webhook Subscription] Database error:", dbError)
      return NextResponse.json(
        { error: "Failed to update subscription in database" },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: "Webhook subscription deleted",
    })
  } catch (error: any) {
    console.error("[Webhook Subscription] Error:", error)
    return NextResponse.json(
      { error: error.message || "Failed to delete webhook subscription" },
      { status: 500 }
    )
  }
}
