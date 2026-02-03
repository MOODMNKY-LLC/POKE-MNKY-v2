/**
 * Fix HTTP Request Node Body Configuration
 * 
 * Updates the HTTP Request node to properly forward the webhook payload
 */

import { config } from "dotenv"
import { getN8nWorkflow, updateN8nWorkflow } from "../lib/n8n/workflow-manager"

config({ path: ".env.local" })

const WORKFLOW_ID = "dmg0GyXA0URBctpx"

async function main() {
  console.log("🔧 Fixing HTTP Request Node Body Configuration\n")
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

    // Update HTTP Request node to forward webhook payload correctly
    console.log("\n2️⃣ Updating HTTP Request node body configuration...")
    httpNode.parameters = {
      ...httpNode.parameters,
      sendBody: true,
      specifyBody: "raw",
      rawBody: "={{ typeof $json.body === 'string' ? $json.body : JSON.stringify($json.body || $json) }}",
      sendHeaders: true,
      headerParameters: {
        parameters: [
          {
            name: "Content-Type",
            value: "application/json",
          },
          {
            name: "x-notion-signature",
            value: "={{ $json.headers?.['x-notion-signature'] || $json.headers?.['X-Notion-Signature'] || '' }}",
          },
        ],
      },
      options: {
        ...httpNode.parameters.options,
        timeout: 10000,
        response: {
          response: {
            fullResponse: false,
            responseFormat: "json",
            neverError: true,
          },
        },
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
    console.log("\n✅ HTTP Request node body configuration fixed!")
    console.log("\n💡 Changes made:")
    console.log("   - Set rawBody to forward webhook payload")
    console.log("   - Handles both string and object payloads")
    console.log("   - Forwards x-notion-signature header")
    console.log("\n🧪 Test by:")
    console.log("   1. Make a change in Notion Draft Board")
    console.log("   2. Check n8n executions")
    console.log("   3. Check Vercel logs for webhook processing")

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
