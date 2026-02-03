/**
 * Diagnostic script to check Notion webhook setup
 * 
 * Checks:
 * 1. n8n workflow status
 * 2. Webhook URL configuration
 * 3. Integration connection status (manual check required)
 */

import { config } from "dotenv"
import { getN8nWorkflow, getN8nWorkflowExecutions } from "../lib/n8n/workflow-manager"

// Load environment variables
config({ path: ".env.local" })

const WORKFLOW_ID = "dmg0GyXA0URBctpx"
const EXPECTED_WEBHOOK_URL = "https://aab-n8n.moodmnky.com/webhook/notion-draft-board"
const EXPECTED_API_URL = "https://poke-mnky.moodmnky.com/api/webhooks/notion"
const N8N_API_URL = process.env.N8N_API_URL || "https://aab-n8n.moodmnky.com"

async function diagnose() {
  console.log("🔍 Notion Webhook Diagnostic\n")
  console.log("=".repeat(60))

  // 1. Check n8n workflow
  console.log("\n1️⃣ Checking n8n Workflow...")
  try {
    const workflow = await getN8nWorkflow(WORKFLOW_ID)

    console.log(`✅ Workflow found: "${workflow.name}"`)
    console.log(`   Status: ${workflow.active ? "🟢 ACTIVE" : "🔴 INACTIVE"}`)
    
    if (!workflow.active) {
      console.error("\n⚠️  CRITICAL: Workflow is INACTIVE!")
      console.error("   → Activate it in n8n dashboard")
    }

    // Check webhook node
    const webhookNode = workflow.nodes?.find((n: any) => n.type === "n8n-nodes-base.webhook")
    if (webhookNode) {
      const webhookPath = webhookNode.parameters?.path || "unknown"
      const webhookUrl = `${N8N_API_URL}/webhook/${webhookPath}`
      console.log(`   Webhook Path: ${webhookPath}`)
      console.log(`   Webhook URL: ${webhookUrl}`)
      
      if (webhookUrl !== EXPECTED_WEBHOOK_URL) {
        console.warn(`   ⚠️  URL mismatch! Expected: ${EXPECTED_WEBHOOK_URL}`)
      }
    }

    // Check HTTP Request node
    const httpNode = workflow.nodes?.find((n: any) => n.name === "Forward to API")
    if (httpNode) {
      const apiUrl = httpNode.parameters?.url || "unknown"
      console.log(`   API Target: ${apiUrl}`)
      
      if (apiUrl !== EXPECTED_API_URL) {
        console.warn(`   ⚠️  API URL mismatch! Expected: ${EXPECTED_API_URL}`)
      }
    }

  } catch (error: any) {
    console.error(`❌ Error checking workflow: ${error.message}`)
    if (error.stack) {
      console.error(error.stack)
    }
  }

  // 2. Check recent executions
  console.log("\n2️⃣ Checking Recent Executions...")
  try {
    const executions = await getN8nWorkflowExecutions(WORKFLOW_ID, 5)
    
    if (executions.length === 0) {
      console.warn("⚠️  No executions found!")
      console.warn("   This means webhooks aren't reaching n8n.")
      console.warn("   Possible causes:")
      console.warn("   - Integration not connected to database in Notion")
      console.warn("   - Webhook URL incorrect in Notion")
      console.warn("   - Notion not sending webhooks")
    } else {
      console.log(`✅ Found ${executions.length} recent execution(s)`)
      executions.forEach((exec: any, idx: number) => {
        const status = exec.finished ? (exec.mode === "error" ? "❌ ERROR" : "✅ SUCCESS") : "⏳ RUNNING"
        const time = exec.startedAt ? new Date(exec.startedAt).toLocaleString() : "unknown"
        console.log(`   ${idx + 1}. ${status} - ${time}`)
        if (exec.mode === "error") {
          console.log(`      Error: ${exec.stoppedAt ? "Execution stopped" : "Check n8n dashboard for details"}`)
        }
      })
    }
  } catch (error: any) {
    console.error(`❌ Error checking executions: ${error.message}`)
    if (error.stack) {
      console.error(error.stack)
    }
  }

  // 3. Manual checks
  console.log("\n3️⃣ Manual Checks Required:")
  console.log("   📋 Checklist:")
  console.log("   [ ] Integration connected to Draft Board database")
  console.log("   [ ] Webhook URL in Notion matches:", EXPECTED_WEBHOOK_URL)
  console.log("   [ ] Webhook subscription is active in Notion")
  console.log("   [ ] Made a test change in Notion Draft Board")
  console.log("   [ ] Checked n8n executions after test change")

  console.log("\n" + "=".repeat(60))
  console.log("\n💡 Next Steps:")
  console.log("   1. Verify integration connection in Notion:")
  console.log("      → Open Draft Board → ... → Connections → Add 'POKE MNKY'")
  console.log("   2. Verify webhook URL in Notion:")
  console.log("      → https://www.notion.so/my-integrations → POKE MNKY → Webhooks")
  console.log("   3. Make a test change in Draft Board")
  console.log("   4. Check n8n executions immediately")
  console.log("   5. Check Vercel logs for API calls")
}

diagnose().catch(console.error)
