/**
 * Setup Notion Webhook Subscription
 *
 * This script helps set up the initial Notion webhook subscription for Draft Board.
 * Since Notion webhooks are created via UI, this script provides instructions
 * and stores the subscription metadata in the database.
 *
 * Usage:
 *   pnpm exec tsx --env-file=.env.local scripts/setup-notion-webhook.ts
 */

import { config } from "dotenv"
import { createClient } from "@supabase/supabase-js"
import { getN8nWebhookUrl, getDirectWebhookUrl } from "../lib/notion/webhook-subscription"

// Load environment variables
config({ path: ".env.local" })

const DRAFT_BOARD_DATABASE_ID = "5e58ccd73ceb44ed83de826b51cf5c36"

async function main() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !serviceRoleKey) {
    console.error("❌ Missing Supabase configuration")
    console.error("   NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required")
    process.exit(1)
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })

  console.log("🔧 Notion Webhook Setup")
  console.log("=" .repeat(50))

  // Determine webhook URL (prefer n8n, fallback to direct)
  const useN8n = process.env.N8N_API_URL && process.env.N8N_API_KEY
  const webhookUrl = useN8n ? getN8nWebhookUrl() : getDirectWebhookUrl()

  console.log("\n📋 Setup Instructions:")
  console.log("   1. Go to: https://www.notion.so/profile/integrations")
  console.log("   2. Select your integration (or create a new one)")
  console.log("   3. Navigate to the 'Webhooks' tab")
  console.log("   4. Click '+ Create a subscription'")
  console.log("   5. Enter webhook URL:")
  console.log(`      ${webhookUrl}`)
  console.log("   6. Select events:")
  console.log("      • database.content_updated")
  console.log("      • page.properties_updated")
  console.log("   7. Click 'Create subscription'")
  console.log("   8. Copy the verification_token from the webhook request")
  console.log("   9. Paste it in Notion's verification form")

  console.log("\n📝 Database ID:")
  console.log(`   ${DRAFT_BOARD_DATABASE_ID}`)

  console.log("\n🔗 Webhook URL:")
  console.log(`   ${webhookUrl}`)

  // Check if subscription already exists
  const { data: existing } = await supabase
    .from("notion_webhook_subscriptions")
    .select("*")
    .eq("database_id", DRAFT_BOARD_DATABASE_ID)
    .eq("active", true)
    .single()

  if (existing) {
    console.log("\n⚠️  Active subscription already exists:")
    console.log(`   Subscription ID: ${existing.subscription_id}`)
    console.log(`   Created: ${new Date(existing.created_at).toLocaleString()}`)
    console.log("\n   To create a new one, delete the existing subscription first.")
    return
  }

  // Generate subscription ID for tracking
  const subscriptionId = `sub_${Date.now()}_${Math.random().toString(36).substring(7)}`

  // Store subscription metadata (will be updated with actual ID after verification)
  const { data: subscription, error } = await supabase
    .from("notion_webhook_subscriptions")
    .insert({
      subscription_id: subscriptionId,
      database_id: DRAFT_BOARD_DATABASE_ID,
      webhook_url: webhookUrl,
      events: ["database.content_updated", "page.properties_updated"],
      active: false, // Will be set to true after verification
    })
    .select()
    .single()

  if (error) {
    console.error("\n❌ Failed to store subscription metadata:", error.message)
    process.exit(1)
  }

  console.log("\n✅ Subscription metadata stored in database")
  console.log(`   Subscription ID: ${subscriptionId}`)
  console.log("\n📌 Next Steps:")
  console.log("   1. Complete the webhook setup in Notion (see instructions above)")
  console.log("   2. When you receive the verification_token, update the subscription:")
  console.log(`      UPDATE notion_webhook_subscriptions`)
  console.log(`      SET verification_token = '<token>', active = true`)
  console.log(`      WHERE subscription_id = '${subscriptionId}'`)
  console.log("\n   3. Or use the admin dashboard to manage subscriptions")
}

main().catch((error) => {
  console.error("❌ Error:", error)
  process.exit(1)
})
