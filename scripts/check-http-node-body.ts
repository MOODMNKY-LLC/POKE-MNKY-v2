/**
 * Check HTTP Request Node Body Configuration
 * 
 * Verifies what body the HTTP Request node is sending to the API
 */

import { config } from "dotenv"
import { getN8nWorkflow } from "../lib/n8n/workflow-manager"

config({ path: ".env.local" })

const WORKFLOW_ID = "dmg0GyXA0URBctpx"

async function main() {
  console.log("🔍 Checking HTTP Request Node Body Configuration\n")
  console.log("=".repeat(60))

  try {
    const workflow = await getN8nWorkflow(WORKFLOW_ID)
    const httpNode = workflow.nodes.find((n: any) => n.name === "Forward to API")

    if (!httpNode) {
      console.error("❌ Could not find 'Forward to API' node")
      process.exit(1)
    }

    console.log("\n📋 HTTP Request Node Configuration:")
    console.log(`   Name: ${httpNode.name}`)
    console.log(`   URL: ${httpNode.parameters?.url}`)
    console.log(`   Method: ${httpNode.parameters?.method}`)
    
    console.log("\n📤 Body Configuration:")
    const sendBody = httpNode.parameters?.sendBody
    const specifyBody = httpNode.parameters?.specifyBody
    console.log(`   Send Body: ${sendBody}`)
    console.log(`   Specify Body: ${specifyBody}`)
    
    if (specifyBody === "json") {
      console.log(`   JSON Body: ${httpNode.parameters?.jsonBody || "not set"}`)
    } else if (specifyBody === "raw") {
      console.log(`   Raw Body: ${httpNode.parameters?.rawBody || "not set"}`)
    } else if (specifyBody === "keyPair") {
      console.log(`   Key-Pair Body: ${JSON.stringify(httpNode.parameters?.bodyParameters || {})}`)
    }
    
    console.log("\n📋 Headers:")
    const sendHeaders = httpNode.parameters?.sendHeaders
    console.log(`   Send Headers: ${sendHeaders}`)
    if (sendHeaders && httpNode.parameters?.headerParameters?.parameters) {
      httpNode.parameters.headerParameters.parameters.forEach((h: any) => {
        console.log(`   - ${h.name}: ${h.value}`)
      })
    }

    console.log("\n💡 Analysis:")
    if (specifyBody === "json" && httpNode.parameters?.jsonBody) {
      const bodyExpr = httpNode.parameters.jsonBody
      if (bodyExpr.includes("$json.body") || bodyExpr.includes("$json")) {
        console.log("   ✅ Body appears to forward webhook payload")
      } else {
        console.log("   ⚠️  Body might not be forwarding webhook payload correctly")
        console.log(`      Current expression: ${bodyExpr.substring(0, 100)}`)
      }
    } else if (specifyBody === "raw" && httpNode.parameters?.rawBody) {
      const bodyExpr = httpNode.parameters.rawBody
      if (bodyExpr.includes("$json.body") || bodyExpr.includes("$json")) {
        console.log("   ✅ Body appears to forward webhook payload")
      } else {
        console.log("   ⚠️  Body might not be forwarding webhook payload correctly")
        console.log(`      Current expression: ${bodyExpr.substring(0, 100)}`)
      }
    } else {
      console.log("   ⚠️  Body configuration unclear - might not be forwarding webhook payload")
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
