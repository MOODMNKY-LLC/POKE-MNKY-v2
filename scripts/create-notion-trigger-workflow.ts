/**
 * Create Notion Trigger Workflow
 * 
 * Creates an n8n workflow using Notion Trigger node (polling) instead of webhooks.
 * This is more reliable than webhooks since Notion webhooks can be unreliable.
 */

import { config } from "dotenv"
import { createN8nWorkflow, getN8nWorkflow, updateN8nWorkflow } from "../lib/n8n/workflow-manager"

config({ path: ".env.local" })

const DRAFT_BOARD_DATABASE_ID = "5e58ccd73ceb44ed83de826b51cf5c36"
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "https://poke-mnky.moodmnky.com"
const NOTION_SYNC_SECRET = process.env.NOTION_SYNC_SECRET

if (!NOTION_SYNC_SECRET) {
  console.error("❌ NOTION_SYNC_SECRET not found in .env.local")
  process.exit(1)
}

async function main() {
  console.log("🔧 Creating Notion Trigger Workflow\n")
  console.log("=".repeat(60))

  try {
    // Create a new workflow (don't replace existing webhook workflow)
    console.log("   Creating new workflow with Notion Trigger...\n")

    // Build workflow nodes using Notion Trigger
    const nodes = [
      // Notion Trigger node (polls for database changes)
      {
        id: "notion-trigger",
        name: "Notion Trigger",
        type: "n8n-nodes-base.notionTrigger",
        typeVersion: 1,
        position: [250, 300],
        parameters: {
          databaseId: DRAFT_BOARD_DATABASE_ID,
          event: "pageUpdated", // Triggers on page updates (includes property changes)
          simple: false, // Return full page data
        },
        // Credentials must be set up manually in n8n UI
        // User will need to add Notion API credentials
      },
      // HTTP Request: Trigger sync
      {
        id: "trigger-sync",
        name: "Trigger Sync",
        type: "n8n-nodes-base.httpRequest",
        typeVersion: 4.1,
        position: [450, 300],
        parameters: {
          method: "POST",
          url: `${APP_URL}/api/webhooks/notion`,
          sendHeaders: true,
          headerParameters: {
            parameters: [
              {
                name: "Content-Type",
                value: "application/json",
              },
              {
                name: "x-notion-signature",
                value: "={{ $json.id }}", // Use page ID as identifier
              },
            ],
          },
          sendBody: true,
          specifyBody: "raw",
          rawBody: "={{ JSON.stringify({ type: 'page.properties_updated', data: { database_id: '" + DRAFT_BOARD_DATABASE_ID + "', page_id: $json.id, properties: $json.properties } }) }}",
          options: {
            timeout: 10000,
            response: {
              response: {
                fullResponse: false,
                responseFormat: "json",
                neverError: true,
              },
            },
          },
        },
      },
      // No response node needed - Notion Trigger doesn't require response
    ]

    // Build connections
    const connections = {
      "Notion Trigger": {
        main: [[{ node: "Trigger Sync", type: "main", index: 0 }]],
      },
    }

    // Create new workflow
    console.log("2️⃣ Creating new workflow...")
    const workflowData = {
      name: "Notion Draft Board Sync (Trigger)",
      // Note: active field is read-only, workflow starts inactive by default
      nodes,
      connections,
      settings: {
        executionOrder: "v1",
        saveManualExecutions: true,
        saveDataErrorExecution: "all",
        saveDataSuccessExecution: "all",
        saveExecutionProgress: false,
        callerPolicy: "workflowsFromSameOwner",
        errorWorkflow: "",
        timezone: "America/New_York",
      },
    }

    const result = await createN8nWorkflow(workflowData as any)
    console.log("   ✅ Workflow created")
    console.log(`\n   Workflow ID: ${result.id}`)
    console.log(`   Workflow URL: https://aab-n8n.moodmnky.com/workflow/${result.id}`)

    console.log("\n" + "=".repeat(60))
    console.log("\n✅ Notion Trigger Workflow Ready!")
    console.log("\n⚠️  IMPORTANT: Manual Setup Required in n8n:")
    console.log("\n📋 Step-by-Step Setup:")
    console.log("\n1. Go to n8n Dashboard:")
    console.log("   https://aab-n8n.moodmnky.com")
    console.log("\n2. Open workflow: 'Notion Draft Board Sync (Trigger)'")
    console.log("\n3. Set up Notion API Credentials:")
    console.log("   a. Click on 'Notion Trigger' node")
    console.log("   b. Click 'Create New Credential' or select existing")
    console.log("   c. Choose 'Internal Integration Secret'")
    console.log("   d. Enter your Notion API Token:")
    console.log(`      ${process.env.NOTION_API_KEY?.substring(0, 20)}...`)
    console.log("   e. Save credentials")
    console.log("\n4. Configure Trigger Node:")
    console.log("   - Database ID: " + DRAFT_BOARD_DATABASE_ID)
    console.log("   - Event: Page Updated")
    console.log("   - Polling Interval: 2 minutes (minimum)")
    console.log("\n5. Verify Integration Connection in Notion:")
    console.log("   - Open Draft Board database in Notion")
    console.log("   - Click '...' → 'Connections'")
    console.log("   - Ensure your integration is connected")
    console.log("\n6. Activate the workflow (toggle switch)")
    console.log("\n💡 Benefits of Notion Trigger:")
    console.log("   ✅ More reliable than webhooks")
    console.log("   ✅ Polls for changes automatically")
    console.log("   ✅ Detects page updates and property changes")
    console.log("   ✅ No webhook subscription needed in Notion")
    console.log("   ⚠️  Polling interval: Minimum 2 minutes (Notion limitation)")

  } catch (error: any) {
    console.error(`\n❌ Error: ${error.message}`)
    if (error.response) {
      console.error(`   Status: ${error.response.status}`)
      console.error(`   Response: ${JSON.stringify(error.response.data)}`)
    }
    if (error.stack) {
      console.error(error.stack)
    }
    process.exit(1)
  }
}

main()
