/**
 * Test Checkbox Webhook Flow
 * 
 * Simulates a checkbox change webhook to verify the flow works
 */

import { config } from "dotenv"
import crypto from "crypto"

config({ path: ".env.local" })

const N8N_WEBHOOK_URL = "https://aab-n8n.moodmnky.com/webhook/notion-draft-board"
const WEBHOOK_SECRET = process.env.NOTION_WEBHOOK_SECRET || "8f660810604bf980c0c316de01260db37e813ff1795edc6d4bf2ca0ca8296093"

// Simulate a checkbox change (page.properties_updated event)
const checkboxChangeWebhook = {
  type: "page.properties_updated",
  data: {
    database_id: "5e58ccd73ceb44ed83de826b51cf5c36",
    page_id: "test-page-id-12345",
    properties: {
      "Added to Draft Board": {
        checkbox: true, // Changed from false to true
      },
    },
  },
}

// Generate a proper Notion signature
function generateNotionSignature(body: string, secret: string): string {
  const hmac = crypto.createHmac("sha256", secret)
  hmac.update(body)
  return `sha256=${hmac.digest("hex")}`
}

async function testCheckboxChange() {
  console.log("🧪 Testing Checkbox Change Webhook Flow\n")
  console.log("=".repeat(60))

  const body = JSON.stringify(checkboxChangeWebhook)
  const signature = generateNotionSignature(body, WEBHOOK_SECRET)

  console.log(`📤 Sending webhook to: ${N8N_WEBHOOK_URL}`)
  console.log(`   Event Type: ${checkboxChangeWebhook.type}`)
  console.log(`   Database ID: ${checkboxChangeWebhook.data.database_id}`)
  console.log(`   Property Changed: Added to Draft Board\n`)

  try {
    const response = await fetch(N8N_WEBHOOK_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-notion-signature": signature,
      },
      body,
    })

    console.log(`📥 Response Status: ${response.status} ${response.statusText}`)
    const responseText = await response.text()
    console.log(`📥 Response Body: ${responseText}`)

    if (response.ok) {
      console.log("\n✅ Webhook processed successfully!")
      console.log("\n💡 Next Steps:")
      console.log("   1. Check n8n executions: https://aab-n8n.moodmnky.com/workflow/dmg0GyXA0URBctpx")
      console.log("   2. Check Vercel logs for API processing")
      console.log("   3. Verify sync job was created in Supabase")
    } else {
      console.log(`\n⚠️  Webhook returned non-200 status`)
      console.log("   Check n8n execution logs for details")
    }
  } catch (error: any) {
    console.error(`\n❌ Error: ${error.message}`)
    if (error.stack) {
      console.error(error.stack)
    }
  }
}

testCheckboxChange().catch(console.error)
