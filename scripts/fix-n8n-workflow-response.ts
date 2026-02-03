/**
 * Fix n8n Workflow to Always Respond
 * 
 * Updates the workflow to ensure it always responds to Notion,
 * even if the API call fails. This prevents Notion from retrying.
 */

import { config } from "dotenv"
import { getN8nWorkflow, updateN8nWorkflow } from "../lib/n8n/workflow-manager"

config({ path: ".env.local" })

const WORKFLOW_ID = "dmg0GyXA0URBctpx"

async function main() {
  console.log("🔧 Fixing n8n Workflow Response Handling\n")
  console.log("=".repeat(60))

  try {
    // Get current workflow
    console.log("1️⃣ Getting current workflow...")
    const workflow = await getN8nWorkflow(WORKFLOW_ID)
    console.log(`   ✅ Found workflow: "${workflow.name}"`)

    // Find the HTTP Request node
    const httpNode = workflow.nodes.find((n: any) => n.name === "Forward to API")
    if (!httpNode) {
      console.error("❌ Could not find 'Forward to API' node")
      process.exit(1)
    }

    // Update HTTP Request node to continue on error
    console.log("\n2️⃣ Updating HTTP Request node to continue on error...")
    httpNode.parameters = {
      ...httpNode.parameters,
      options: {
        ...httpNode.parameters.options,
        timeout: 10000, // 10 second timeout
        response: {
          response: {
            fullResponse: false,
            responseFormat: "json",
            neverError: true, // Continue even on HTTP errors
          },
        },
      },
    }

    // Find the response node
    const responseNode = workflow.nodes.find((n: any) => n.type === "n8n-nodes-base.respondToWebhook")
    if (!responseNode) {
      console.error("❌ Could not find response node")
      process.exit(1)
    }

    // Update response node to always return success
    console.log("\n3️⃣ Updating response node to always return success...")
    responseNode.parameters = {
      respondWith: "json",
      responseBody: "={{ $json.success !== undefined ? $json : { success: true, message: 'Webhook received' } }}",
      options: {
        responseCode: 200,
      },
    }

    // Update workflow
    console.log("\n4️⃣ Updating workflow in n8n...")
    const updated = await updateN8nWorkflow(WORKFLOW_ID, {
      name: workflow.name,
      nodes: workflow.nodes,
      connections: workflow.connections,
      settings: workflow.settings || {},
    })

    console.log("   ✅ Workflow updated successfully")

    console.log("\n" + "=".repeat(60))
    console.log("\n✅ Workflow fixed!")
    console.log("\n💡 Changes made:")
    console.log("   1. HTTP Request node now continues on error (neverError: true)")
    console.log("   2. Response node always returns 200 OK")
    console.log("   3. This ensures Notion receives a response even if API fails")
    console.log("\n⚠️  IMPORTANT: Set NOTION_WEBHOOK_SECRET in Vercel to fix API errors")
    console.log("   After that, webhooks should work correctly!")

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
