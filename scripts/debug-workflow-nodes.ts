/**
 * Debug Workflow Nodes - Print Full Node Configurations
 */

import { config } from "dotenv"
import { getN8nWorkflow } from "../lib/n8n/workflow-manager"

config({ path: ".env.local" })

const WORKFLOW_ID = "AeazX7cYBLeNmRBJ"

async function main() {
  try {
    const workflow = await getN8nWorkflow(WORKFLOW_ID)
    
    console.log("🔍 Full Node Configurations:\n")
    console.log("=".repeat(60))
    
    workflow.nodes.forEach((node, idx) => {
      console.log(`\n${idx + 1}. ${node.name} (${node.type})`)
      console.log("-".repeat(60))
      console.log(JSON.stringify(node.parameters, null, 2))
      console.log("\nCredentials:", (node as any).credentials || "None")
    })
    
  } catch (error: any) {
    console.error(`❌ Error: ${error.message}`)
    if (error.response) {
      console.error(`   Status: ${error.response.status}`)
      console.error(`   Response: ${JSON.stringify(error.response.data)}`)
    }
    process.exit(1)
  }
}

main()
