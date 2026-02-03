/**
 * Check HTTP Request Node Configuration
 * 
 * Verifies the HTTP Request node has the correct error handling settings
 */

import { config } from "dotenv"
import { getN8nWorkflow } from "../lib/n8n/workflow-manager"

config({ path: ".env.local" })

const WORKFLOW_ID = "dmg0GyXA0URBctpx"

async function main() {
  console.log("🔍 Checking HTTP Request Node Configuration\n")
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
    
    console.log("\n⚙️  Options:")
    const options = httpNode.parameters?.options || {}
    console.log(`   Timeout: ${options.timeout || "not set"}`)
    
    const responseOptions = options.response?.response || {}
    console.log(`   Full Response: ${responseOptions.fullResponse || false}`)
    console.log(`   Response Format: ${responseOptions.responseFormat || "not set"}`)
    console.log(`   Never Error: ${responseOptions.neverError || false}`)
    
    if (!responseOptions.neverError) {
      console.error("\n⚠️  CRITICAL: 'neverError' is not set to true!")
      console.error("   This means the workflow will stop on API errors.")
      console.error("   The workflow update may not have taken effect.")
    } else {
      console.log("\n✅ 'neverError' is set correctly")
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
