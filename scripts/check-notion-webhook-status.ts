/**
 * Check Notion Webhook Subscription Status
 * 
 * Verifies if Notion webhook subscription is actually active
 */

import { config } from "dotenv"
import { createClient } from "@supabase/supabase-js"

config({ path: ".env.local" })

const DRAFT_BOARD_DATABASE_ID = "5e58ccd73ceb44ed83de826b51cf5c36"

async function main() {
  console.log("🔍 Checking Notion Webhook Subscription Status\n")
  console.log("=".repeat(60))

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !serviceRoleKey) {
    console.error("❌ Missing Supabase configuration")
    process.exit(1)
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })

  // Check database for subscriptions
  const { data: subscriptions, error } = await supabase
    .from("notion_webhook_subscriptions")
    .select("*")
    .eq("database_id", DRAFT_BOARD_DATABASE_ID)
    .order("created_at", { ascending: false })

  if (error) {
    console.error(`❌ Error querying subscriptions: ${error.message}`)
    process.exit(1)
  }

  console.log(`\n📋 Found ${subscriptions?.length || 0} subscription(s) in database\n`)

  if (!subscriptions || subscriptions.length === 0) {
    console.log("⚠️  No webhook subscriptions found!")
    console.log("\n💡 This suggests:")
    console.log("   - Webhook subscription was never created in Notion")
    console.log("   - Or subscription was deleted")
    console.log("\n✅ Solution: Use n8n Notion Trigger instead (more reliable)")
  } else {
    subscriptions.forEach((sub, i) => {
      console.log(`${i + 1}. Subscription ID: ${sub.subscription_id}`)
      console.log(`   Webhook URL: ${sub.webhook_url}`)
      console.log(`   Active: ${sub.active ? "✅ YES" : "❌ NO"}`)
      console.log(`   Created: ${new Date(sub.created_at).toLocaleString()}`)
      console.log(`   Events: ${sub.events.join(", ")}`)
      console.log()
    })
  }

  console.log("=".repeat(60))
  console.log("\n💡 Recommendation:")
  console.log("   Since Notion webhooks are unreliable, switch to n8n Notion Trigger:")
  console.log("   - More reliable (polls for changes)")
  console.log("   - No webhook subscription needed")
  console.log("   - Detects page updates automatically")
  console.log("   - Minimum polling interval: 2 minutes")
  console.log("\n   Run: pnpm exec tsx --env-file=.env.local scripts/create-notion-trigger-workflow.ts")
}

main().catch(console.error)
