/**
 * Fix n8n Webhook Registration
 * 
 * The workflow shows as active but the webhook endpoint returns 404.
 * This script deactivates and reactivates the workflow to force
 * n8n to re-register the webhook.
 */

import { config } from "dotenv"
import axios from "axios"
import {
  getN8nWorkflow,
  deactivateN8nWorkflow,
  activateN8nWorkflow,
} from "../lib/n8n/workflow-manager"

config({ path: ".env.local" })

const WORKFLOW_ID = "dmg0GyXA0URBctpx"
const N8N_API_URL = process.env.N8N_API_URL || "https://aab-n8n.moodmnky.com"

async function main() {
  console.log("🔧 Fixing n8n Webhook Registration\n")
  console.log("=".repeat(60))

  try {
    // Get current state
    console.log("1️⃣ Getting current workflow state...")
    const current = await getN8nWorkflow(WORKFLOW_ID)
    console.log(`   Current status: ${current.active ? "🟢 ACTIVE" : "🔴 INACTIVE"}`)
    console.log(`   Workflow name: "${current.name}"`)

    // Deactivate
    console.log("\n2️⃣ Deactivating workflow...")
    await deactivateN8nWorkflow(WORKFLOW_ID)
    console.log("   ✅ Workflow deactivated")
    
    // Wait a moment
    console.log("\n3️⃣ Waiting 3 seconds for deactivation to complete...")
    await new Promise(resolve => setTimeout(resolve, 3000))

    // Verify deactivated
    const deactivated = await getN8nWorkflow(WORKFLOW_ID)
    console.log(`   Verified: ${deactivated.active ? "⚠️  Still active" : "✅ Confirmed inactive"}`)

    // Reactivate
    console.log("\n4️⃣ Reactivating workflow...")
    await activateN8nWorkflow(WORKFLOW_ID)
    console.log("   ✅ Workflow reactivated")

    // Wait for webhook registration
    console.log("\n5️⃣ Waiting 5 seconds for webhook registration...")
    await new Promise(resolve => setTimeout(resolve, 5000))

    // Verify reactivated
    const reactivated = await getN8nWorkflow(WORKFLOW_ID)
    console.log(`   Verified: ${reactivated.active ? "✅ Confirmed active" : "⚠️  Still inactive"}`)

    // Test webhook endpoint
    console.log("\n6️⃣ Testing webhook endpoint...")
    try {
      const testResponse = await axios.post(
        `${N8N_API_URL}/webhook/notion-draft-board`,
        { test: "webhook" },
        { validateStatus: () => true }
      )

      if (testResponse.status === 200 || testResponse.status === 404) {
        const responseText = testResponse.data?.message || JSON.stringify(testResponse.data)
        if (responseText.includes("not registered")) {
          console.log("   ⚠️  Webhook still not registered")
          console.log("   → Try manually toggling the workflow in n8n UI")
        } else {
          console.log("   ✅ Webhook endpoint is responding!")
        }
      } else {
        console.log(`   Status: ${testResponse.status}`)
      }
    } catch (error: any) {
      console.log(`   ⚠️  Test error: ${error.message}`)
    }

    console.log("\n" + "=".repeat(60))
    console.log("\n✅ Workflow reactivated")
    console.log("\n💡 Next Steps:")
    console.log("   1. Test the webhook endpoint manually")
    console.log("   2. Make a change in Notion Draft Board")
    console.log("   3. Check n8n executions for new webhook events")

  } catch (error: any) {
    console.error(`\n❌ Error: ${error.message}`)
    if (error.response) {
      console.error(`   Status: ${error.response.status}`)
      console.error(`   Response: ${JSON.stringify(error.response.data)}`)
    }
    process.exit(1)
  }
}

main()
