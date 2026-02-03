/**
 * Inspect n8n Workflow Configuration
 * 
 * Checks the workflow structure, connections, and response node configuration
 */

import { config } from "dotenv"
import { getN8nWorkflow } from "../lib/n8n/workflow-manager"

config({ path: ".env.local" })

const WORKFLOW_ID = "dmg0GyXA0URBctpx"

async function main() {
  console.log("🔍 Inspecting n8n Workflow\n")
  console.log("=".repeat(60))

  try {
    const workflow = await getN8nWorkflow(WORKFLOW_ID)

    console.log(`\n📋 Workflow: "${workflow.name}"`)
    console.log(`   Status: ${workflow.active ? "🟢 ACTIVE" : "🔴 INACTIVE"}\n`)

    console.log("📦 Nodes:")
    workflow.nodes.forEach((node, idx) => {
      console.log(`   ${idx + 1}. ${node.name}`)
      console.log(`      Type: ${node.type}`)
      
      if (node.type === "n8n-nodes-base.webhook") {
        console.log(`      Response Mode: ${node.parameters?.responseMode || "unknown"}`)
        console.log(`      Path: ${node.parameters?.path || "unknown"}`)
      }
      
      if (node.type === "n8n-nodes-base.respondToWebhook") {
        console.log(`      Respond With: ${node.parameters?.respondWith || "unknown"}`)
        console.log(`      Response Code: ${node.parameters?.options?.responseCode || "unknown"}`)
        console.log(`      Response Body: ${JSON.stringify(node.parameters?.responseBody || {}).substring(0, 100)}`)
      }
      
      if (node.type === "n8n-nodes-base.httpRequest") {
        console.log(`      URL: ${node.parameters?.url || "unknown"}`)
        console.log(`      Method: ${node.parameters?.method || "unknown"}`)
      }
      
      console.log()
    })

    console.log("🔗 Connections:")
    console.log(JSON.stringify(workflow.connections, null, 2))

    // Check if response node is connected
    const responseNode = workflow.nodes.find(n => n.type === "n8n-nodes-base.respondToWebhook")
    if (responseNode) {
      const responseNodeName = responseNode.name
      const isConnected = Object.values(workflow.connections || {}).some((conn: any) => {
        return JSON.stringify(conn).includes(responseNodeName)
      })
      
      console.log(`\n✅ Response Node Found: "${responseNodeName}"`)
      console.log(`   Connected: ${isConnected ? "✅ YES" : "❌ NO"}`)
      
      if (!isConnected) {
        console.error("\n⚠️  CRITICAL: Response node exists but is NOT connected!")
        console.error("   This means Notion requests will timeout.")
        console.error("   Fix: Connect the last node to the response node.")
      }
    } else {
      console.error("\n❌ CRITICAL: No response node found!")
      console.error("   This means Notion requests will timeout.")
    }

  } catch (error: any) {
    console.error(`\n❌ Error: ${error.message}`)
    if (error.stack) {
      console.error(error.stack)
    }
    process.exit(1)
  }
}

main()
