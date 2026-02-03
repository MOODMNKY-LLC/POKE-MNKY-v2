/**
 * Check Recent n8n Workflow Executions
 * 
 * Shows recent executions and their status/errors
 */

import { config } from "dotenv"
import { getN8nWorkflowExecutions } from "../lib/n8n/workflow-manager"

config({ path: ".env.local" })

const WORKFLOW_ID = "dmg0GyXA0URBctpx"

async function main() {
  console.log("🔍 Checking Recent n8n Executions\n")
  console.log("=".repeat(60))

  try {
    const executions = await getN8nWorkflowExecutions(WORKFLOW_ID, 10)

    if (executions.length === 0) {
      console.log("\n⚠️  No executions found")
      console.log("   This means webhooks aren't reaching n8n yet.")
      return
    }

    console.log(`\n📊 Found ${executions.length} recent execution(s)\n`)

    executions.forEach((exec: any, idx: number) => {
      const status = exec.finished 
        ? (exec.mode === "error" ? "❌ ERROR" : "✅ SUCCESS")
        : "⏳ RUNNING"
      
      const time = exec.startedAt 
        ? new Date(exec.startedAt).toLocaleString() 
        : "unknown"
      
      console.log(`${idx + 1}. ${status} - ${time}`)
      console.log(`   Execution ID: ${exec.id}`)
      console.log(`   Mode: ${exec.mode || "unknown"}`)
      
      if (exec.finished) {
        const duration = exec.stoppedAt && exec.startedAt
          ? `${Math.round((new Date(exec.stoppedAt).getTime() - new Date(exec.startedAt).getTime()) / 1000)}s`
          : "unknown"
        console.log(`   Duration: ${duration}`)
      }
      
      if (exec.mode === "error") {
        console.log(`   ⚠️  Error occurred - check n8n dashboard for details`)
      }
      
      console.log()
    })

    console.log("\n💡 To see detailed error information:")
    console.log(`   Go to: https://aab-n8n.moodmnky.com/workflow/${WORKFLOW_ID}`)
    console.log(`   Click on an execution to see node-level errors`)

  } catch (error: any) {
    console.error(`\n❌ Error: ${error.message}`)
    if (error.stack) {
      console.error(error.stack)
    }
    process.exit(1)
  }
}

main()
