/**
 * Fix Workflow Verification Token Handling
 * 
 * Updates the workflow to properly handle verification tokens from Notion
 */

import { config } from "dotenv"
import { getN8nWorkflow, updateN8nWorkflow } from "../lib/n8n/workflow-manager"

config({ path: ".env.local" })

const WORKFLOW_ID = "dmg0GyXA0URBctpx"

async function main() {
  console.log("🔧 Fixing Workflow Verification Token Handling\n")
  console.log("=".repeat(60))

  try {
    // Get current workflow
    console.log("1️⃣ Getting current workflow...")
    const workflow = await getN8nWorkflow(WORKFLOW_ID)
    console.log(`   ✅ Found workflow: "${workflow.name}"`)

    // Add an IF node to check for verification tokens
    const webhookNode = workflow.nodes.find((n: any) => n.type === "n8n-nodes-base.webhook")
    const httpNode = workflow.nodes.find((n: any) => n.name === "Forward to API")
    const responseNode = workflow.nodes.find((n: any) => n.type === "n8n-nodes-base.respondToWebhook")

    if (!webhookNode || !httpNode || !responseNode) {
      console.error("❌ Could not find required nodes")
      process.exit(1)
    }

    // Check if verification check node already exists
    let verificationNode = workflow.nodes.find((n: any) => n.name === "Check Verification Token")
    
    if (!verificationNode) {
      console.log("\n2️⃣ Adding verification token check node...")
      
      // Create verification check node
      verificationNode = {
        id: "check-verification",
        name: "Check Verification Token",
        type: "n8n-nodes-base.if",
        typeVersion: 1,
        position: [350, 300],
        parameters: {
          conditions: {
            options: {
              caseSensitive: true,
              leftValue: "",
              typeValidation: "strict",
            },
            string: [
              {
                value1: "={{ $json.body.verification_token }}",
                operation: "isNotEmpty",
              },
            ],
          },
        },
      }

      workflow.nodes.push(verificationNode)
    } else {
      console.log("\n2️⃣ Verification check node already exists, updating...")
    }

    // Create a Set node to format verification response
    let verificationResponseNode = workflow.nodes.find((n: any) => n.name === "Verification Response")
    
    if (!verificationResponseNode) {
      console.log("3️⃣ Adding verification response node...")
      
      verificationResponseNode = {
        id: "verification-response",
        name: "Verification Response",
        type: "n8n-nodes-base.set",
        typeVersion: 3.4,
        position: [450, 200], // Above the normal flow
        parameters: {
          values: {
            string: [
              {
                name: "verification_token",
                value: "={{ $json.body.verification_token }}",
              },
            ],
          },
          options: {},
        },
      }

      workflow.nodes.push(verificationResponseNode)
    } else {
      console.log("3️⃣ Verification response node already exists, updating...")
    }

    // Update connections
    console.log("\n4️⃣ Updating workflow connections...")
    
    // Webhook → Check Verification
    workflow.connections["Notion Webhook"] = {
      main: [[{ node: "Check Verification Token", type: "main", index: 0 }]],
    }

    // Check Verification → True: Verification Response → Respond
    // Check Verification → False: Forward to API → Respond
    workflow.connections["Check Verification Token"] = {
      main: [
        [{ node: "Verification Response", type: "main", index: 0 }], // True branch
        [{ node: "Forward to API", type: "main", index: 0 }], // False branch
      ],
    }

    workflow.connections["Verification Response"] = {
      main: [[{ node: "Respond to Notion", type: "main", index: 0 }]],
    }

    // Keep existing Forward to API → Respond connection
    workflow.connections["Forward to API"] = {
      main: [[{ node: "Respond to Notion", type: "main", index: 0 }]],
    }

    // Update response node to handle both cases
    responseNode.parameters = {
      respondWith: "json",
      responseBody: "={{ $json.verification_token ? { verification_token: $json.verification_token } : ($json.success !== undefined ? $json : { success: true, message: 'Webhook received' }) }}",
      options: {
        responseCode: 200,
      },
    }

    // Update workflow
    console.log("\n5️⃣ Updating workflow in n8n...")
    await updateN8nWorkflow(WORKFLOW_ID, {
      name: workflow.name,
      nodes: workflow.nodes,
      connections: workflow.connections,
      settings: workflow.settings || {},
    })

    console.log("   ✅ Workflow updated successfully")

    console.log("\n" + "=".repeat(60))
    console.log("\n✅ Verification token handling fixed!")
    console.log("\n💡 Workflow now:")
    console.log("   1. Checks if request has verification_token")
    console.log("   2. If yes: Returns verification_token directly")
    console.log("   3. If no: Forwards to API as normal webhook")

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
