/**
 * Verify Notion-Supabase Sync Workflow Configuration
 * 
 * Checks the workflow structure, node configurations, credentials, and connections
 */

import { config } from "dotenv"
import { getN8nWorkflow } from "../lib/n8n/workflow-manager"

config({ path: ".env.local" })

const WORKFLOW_ID = "AeazX7cYBLeNmRBJ"

async function main() {
  console.log("🔍 Verifying Notion-Supabase Sync Workflow\n")
  console.log("=".repeat(60))

  try {
    const workflow = await getN8nWorkflow(WORKFLOW_ID)

    console.log(`\n📋 Workflow: "${workflow.name}"`)
    console.log(`   ID: ${workflow.id}`)
    console.log(`   Status: ${workflow.active ? "🟢 ACTIVE" : "🔴 INACTIVE"}\n`)

    if (!workflow.active) {
      console.log("⚠️  WARNING: Workflow is not active. It won't trigger automatically.\n")
    }

    // Expected nodes
    const expectedNodes = [
      "Notion Trigger",
      "Filter Added to Draft Board",
      "Get Page Data",
      "Get Current Season",
      "Transform to Supabase",
      "Upsert to Supabase",
      "Discord Notification",
    ]

    console.log("📦 Node Verification:\n")
    const foundNodes: string[] = []
    const issues: string[] = []

    workflow.nodes.forEach((node, idx) => {
      const nodeName = node.name
      foundNodes.push(nodeName)
      
      console.log(`   ${idx + 1}. ${nodeName}`)
      console.log(`      Type: ${node.type}`)
      
      // Check Notion Trigger
      if (node.type === "n8n-nodes-base.notionTrigger") {
        const databaseId = node.parameters?.databaseId
        const event = node.parameters?.event
        const simple = node.parameters?.simple
        
        console.log(`      Database ID: ${databaseId || "❌ MISSING"}`)
        console.log(`      Event: ${event || "❌ MISSING"}`)
        console.log(`      Simple Mode: ${simple}`)
        
        if (!databaseId) {
          issues.push("Notion Trigger: Database ID is missing")
        }
        if (databaseId !== "5e58ccd73ceb44ed83de826b51cf5c36") {
          issues.push(`Notion Trigger: Database ID mismatch (expected: 5e58ccd73ceb44ed83de826b51cf5c36, got: ${databaseId})`)
        }
        if (event !== "pageUpdated") {
          issues.push(`Notion Trigger: Event should be 'pageUpdated' (got: ${event})`)
        }
        
        // Check credentials
        const credentials = (node as any).credentials
        if (!credentials || Object.keys(credentials).length === 0) {
          issues.push("Notion Trigger: No credentials configured")
        } else {
          console.log(`      ✅ Credentials: Configured`)
        }
      }
      
      // Check IF node (Filter)
      if (node.type === "n8n-nodes-base.if") {
        const conditions = node.parameters?.conditions
        console.log(`      Conditions: ${conditions ? "✅ Configured" : "❌ MISSING"}`)
        if (!conditions) {
          issues.push("Filter Added to Draft Board: Conditions not configured")
        }
      }
      
      // Check Notion Get Page
      if (node.type === "n8n-nodes-base.notion" && node.parameters?.operation === "get") {
        const pageId = node.parameters?.pageId
        console.log(`      Page ID Expression: ${pageId || "❌ MISSING"}`)
        if (!pageId || !pageId.includes("$json.id")) {
          issues.push("Get Page Data: Page ID expression should reference $json.id")
        }
        
        const credentials = (node as any).credentials
        if (!credentials || Object.keys(credentials).length === 0) {
          issues.push("Get Page Data: No credentials configured")
        } else {
          console.log(`      ✅ Credentials: Configured`)
        }
      }
      
      // Check Supabase nodes
      if (node.type === "n8n-nodes-base.supabase") {
        const operation = node.parameters?.operation
        const table = node.parameters?.table
        
        console.log(`      Operation: ${operation || "❌ MISSING"}`)
        console.log(`      Table: ${table || "❌ MISSING"}`)
        
        if (operation === "select") {
          // Get Current Season node
          const filters = node.parameters?.filters
          console.log(`      Filters: ${filters ? "✅ Configured" : "❌ MISSING"}`)
          if (!filters || !filters.conditions) {
            issues.push("Get Current Season: Filters not configured (should filter is_current = true)")
          }
        } else if (operation === "upsert") {
          // Upsert to Supabase node
          const matchColumns = node.parameters?.matchColumns
          const columns = node.parameters?.columns
          
          console.log(`      Match Columns: ${matchColumns ? matchColumns.join(", ") : "❌ MISSING"}`)
          console.log(`      Columns Mapping: ${columns ? "✅ Configured" : "❌ MISSING"}`)
          
          if (!matchColumns || !matchColumns.includes("season_id") || !matchColumns.includes("pokemon_name")) {
            issues.push("Upsert to Supabase: Match columns should include 'season_id' and 'pokemon_name'")
          }
          if (!columns || !columns.value) {
            issues.push("Upsert to Supabase: Column mappings not configured")
          }
        }
        
        const credentials = (node as any).credentials
        if (!credentials || Object.keys(credentials).length === 0) {
          issues.push(`${nodeName}: No Supabase credentials configured`)
        } else {
          console.log(`      ✅ Credentials: Configured`)
        }
      }
      
      // Check Function node
      if (node.type === "n8n-nodes-base.function") {
        const functionCode = node.parameters?.functionCode
        console.log(`      Function Code: ${functionCode ? `✅ Present (${functionCode.length} chars)` : "❌ MISSING"}`)
        
        if (!functionCode) {
          issues.push("Transform to Supabase: Function code is missing")
        } else {
          // Check for key logic
          if (!functionCode.includes("seasonData")) {
            issues.push("Transform to Supabase: Function should reference 'Get Current Season' node data")
          }
          if (!functionCode.includes("pokemon_name")) {
            issues.push("Transform to Supabase: Function should extract pokemon_name")
          }
          if (!functionCode.includes("point_value")) {
            issues.push("Transform to Supabase: Function should extract point_value")
          }
        }
      }
      
      // Check Discord node
      if (node.type === "n8n-nodes-base.discord") {
        const webhookUrl = node.parameters?.webhookUrl
        console.log(`      Webhook URL: ${webhookUrl ? "✅ Configured" : "❌ MISSING"}`)
        if (!webhookUrl) {
          issues.push("Discord Notification: Webhook URL not configured")
        }
      }
      
      console.log()
    })

    // Check for missing nodes
    const missingNodes = expectedNodes.filter(name => !foundNodes.includes(name))
    if (missingNodes.length > 0) {
      console.log("❌ Missing Expected Nodes:")
      missingNodes.forEach(name => {
        console.log(`   - ${name}`)
        issues.push(`Missing node: ${name}`)
      })
      console.log()
    }

    // Verify connections
    console.log("🔗 Connection Verification:\n")
    const connections = workflow.connections || {}
    
    const expectedConnections = [
      { from: "Notion Trigger", to: "Filter Added to Draft Board" },
      { from: "Filter Added to Draft Board", to: "Get Page Data" },
      { from: "Get Page Data", to: "Get Current Season" },
      { from: "Get Current Season", to: "Transform to Supabase" },
      { from: "Transform to Supabase", to: "Upsert to Supabase" },
      { from: "Upsert to Supabase", to: "Discord Notification" },
    ]

    expectedConnections.forEach(({ from, to }) => {
      const fromConnections = connections[from]
      const isConnected = fromConnections?.main?.some((conn: any[]) => 
        conn.some((c: any) => c.node === to)
      )
      
      if (isConnected) {
        console.log(`   ✅ ${from} → ${to}`)
      } else {
        console.log(`   ❌ ${from} → ${to} (MISSING)`)
        issues.push(`Missing connection: ${from} → ${to}`)
      }
    })

    // Summary
    console.log("\n" + "=".repeat(60))
    console.log("\n📊 Summary:\n")
    
    if (issues.length === 0) {
      console.log("✅ All checks passed! Workflow is properly configured.")
      console.log("\n💡 Next Steps:")
      console.log("   1. Ensure workflow is ACTIVE (toggle in top-right)")
      console.log("   2. Test with a manual execution")
      console.log("   3. Make a test change in Notion Draft Board")
      console.log("   4. Monitor executions in n8n dashboard")
    } else {
      console.log(`⚠️  Found ${issues.length} issue(s):\n`)
      issues.forEach((issue, idx) => {
        console.log(`   ${idx + 1}. ${issue}`)
      })
      console.log("\n💡 Fix these issues in the n8n dashboard:")
      console.log(`   https://aab-n8n.moodmnky.com/workflow/${WORKFLOW_ID}`)
    }

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
