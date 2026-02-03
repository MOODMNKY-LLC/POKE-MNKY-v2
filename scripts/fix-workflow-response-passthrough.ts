/**
 * Fix Workflow Response Passthrough
 * 
 * Updates the response node to pass through the API response directly
 */

import { config } from "dotenv"
import { getN8nWorkflow, updateN8nWorkflow } from "../lib/n8n/workflow-manager"

config({ path: ".env.local" })

const WORKFLOW_ID = "dmg0GyXA0URBctpx"

async function main() {
  console.log("🔧 Fixing Workflow Response Passthrough\n")
  console.log("=".repeat(60))

  try {
    // Get current workflow
    console.log("1️⃣ Getting current workflow...")
    const workflow = await getN8nWorkflow(WORKFLOW_ID)
    console.log(`   ✅ Found workflow: "${workflow.name}"`)

    // Find the response node
    const responseNode = workflow.nodes.find((n: any) => n.type === "n8n-nodes-base.respondToWebhook")
    if (!responseNode) {
      console.error("❌ Could not find response node")
      process.exit(1)
    }

    // Update response node to pass through API response
    console.log("\n2️⃣ Updating response node to pass through API response...")
    responseNode.parameters = {
      respondWith: "json",
      // Pass through the API response directly, or use fallback for verification tokens
      responseBody: "={{ $json.verification_token ? { verification_token: $json.verification_token } : ($json.success !== undefined ? $json : ($json.body?.verification_token ? { verification_token: $json.body.verification_token } : { success: true, message: 'Webhook received' })) }}",
      options: {
        responseCode: 200,
      },
    }

    // Update workflow
    console.log("\n3️⃣ Updating workflow in n8n...")
    await updateN8nWorkflow(WORKFLOW_ID, {
      name: workflow.name,
      nodes: workflow.nodes,
      connections: workflow.connections,
      settings: workflow.settings || {},
    })

    console.log("   ✅ Workflow updated successfully")

    console.log("\n" + "=".repeat(60))
    console.log("\n✅ Response passthrough fixed!")
    console.log("\n💡 Response node now:")
    console.log("   - Passes through API response directly")
    console.log("   - Handles verification tokens from API")
    console.log("   - Falls back to success message if needed")

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
