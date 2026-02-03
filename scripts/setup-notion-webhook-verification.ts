/**
 * Setup Notion Webhook Verification
 * 
 * This script helps set up the n8n workflow and provides instructions
 * for retrieving the verification token from Notion.
 * 
 * Usage:
 *   pnpm exec tsx --env-file=.env.local scripts/setup-notion-webhook-verification.ts
 */

import { createNotionSyncWorkflow } from "@/lib/n8n/workflow-manager"
import dotenv from "dotenv"
import { resolve } from "path"

// Load environment variables
dotenv.config({ path: resolve(process.cwd(), ".env.local") })

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "https://poke-mnky.moodmnky.com"
const N8N_API_URL = process.env.N8N_API_URL || "https://aab-n8n.moodmnky.com"

async function main() {
  console.log("🔧 Setting up Notion Webhook Verification\n")

  console.log("📋 Step 1: Creating n8n workflow...")
  
  try {
    // Option 1: n8n workflow that forwards to our webhook handler
    // The workflow receives from Notion, then forwards to /api/webhooks/notion
    const result = await createNotionSyncWorkflow(
      `${N8N_API_URL}/webhook/notion-draft-board`, // n8n webhook path
      `${APP_URL}/api/webhooks/notion`, // Forward to our webhook handler
      undefined // Discord webhook URL (optional)
    )

    console.log("✅ n8n workflow created successfully!")
    console.log(`   Workflow ID: ${result.workflowId}`)
    console.log(`   Webhook URL: ${result.webhookUrl}\n`)

    console.log("⚠️  IMPORTANT: You must activate the workflow in n8n dashboard:")
    console.log(`   ${N8N_API_URL}/workflow/${result.workflowId}\n`)

    console.log("📋 Step 2: Configure Notion Webhook")
    console.log("   1. Go to: https://www.notion.so/my-integrations")
    console.log("   2. Select your integration")
    console.log("   3. Go to 'Webhooks' tab")
    console.log(`   4. Set Webhook URL to: ${result.webhookUrl}`)
    console.log("   5. Select events: 'database.content_updated', 'page.properties_updated'")
    console.log("   6. Click 'Save'\n")

    console.log("📋 Step 3: Retrieve Verification Token")
    console.log("   When Notion sends the verification request:")
    console.log("   1. Check n8n workflow execution logs")
    console.log("   2. Look for the incoming webhook payload")
    console.log("   3. Extract 'verification_token' from the JSON body")
    console.log("   4. Enter it in Notion's verification dialog\n")

    console.log("📋 Alternative: Use Direct API Endpoint (Bypass n8n)")
    console.log(`   Webhook URL: ${APP_URL}/api/webhooks/notion`)
    console.log("   This endpoint already handles verification tokens automatically.\n")

  } catch (error: any) {
    console.error("❌ Error creating workflow:", error.message)
    console.error("\n💡 Alternative: Create workflow manually in n8n dashboard:")
    console.log(`   ${N8N_API_URL}`)
    process.exit(1)
  }
}

main().catch(console.error)
