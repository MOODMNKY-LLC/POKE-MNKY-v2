/**
 * Test Notion Webhook Flow
 * 
 * Tests the complete webhook flow:
 * 1. Test n8n webhook endpoint directly
 * 2. Test our API endpoint directly
 * 3. Simulate a Notion webhook payload
 */

import { config } from "dotenv"
config({ path: ".env.local" })

const N8N_WEBHOOK_URL = "https://aab-n8n.moodmnky.com/webhook/notion-draft-board"
const API_WEBHOOK_URL = "https://poke-mnky.moodmnky.com/api/webhooks/notion"

// Simulate a Notion webhook payload
const mockNotionWebhook = {
  type: "database.content_updated",
  data: {
    database_id: "5e58ccd73ceb44ed83de826b51cf5c36",
  },
}

async function testN8nWebhook() {
  console.log("🧪 Testing n8n Webhook Endpoint...")
  console.log(`   URL: ${N8N_WEBHOOK_URL}\n`)

  try {
    const response = await fetch(N8N_WEBHOOK_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-notion-signature": "sha256=test-signature",
      },
      body: JSON.stringify(mockNotionWebhook),
    })

    console.log(`   Status: ${response.status} ${response.statusText}`)
    const responseText = await response.text()
    console.log(`   Response: ${responseText.substring(0, 200)}`)
    
    if (response.ok) {
      console.log("   ✅ n8n webhook endpoint is reachable\n")
    } else {
      console.log(`   ⚠️  n8n webhook returned non-200 status\n`)
    }
  } catch (error: any) {
    console.error(`   ❌ Error testing n8n webhook: ${error.message}\n`)
  }
}

async function testApiWebhook() {
  console.log("🧪 Testing API Webhook Endpoint...")
  console.log(`   URL: ${API_WEBHOOK_URL}\n`)

  try {
    const response = await fetch(API_WEBHOOK_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-notion-signature": "sha256=test-signature",
      },
      body: JSON.stringify(mockNotionWebhook),
    })

    console.log(`   Status: ${response.status} ${response.statusText}`)
    const responseText = await response.text()
    console.log(`   Response: ${responseText.substring(0, 200)}`)
    
    if (response.ok) {
      console.log("   ✅ API webhook endpoint is reachable\n")
    } else {
      console.log(`   ⚠️  API webhook returned non-200 status\n`)
    }
  } catch (error: any) {
    console.error(`   ❌ Error testing API webhook: ${error.message}\n`)
  }
}

async function testVerificationToken() {
  console.log("🧪 Testing Verification Token Handling...")
  console.log(`   URL: ${N8N_WEBHOOK_URL}\n`)

  const verificationPayload = {
    verification_token: "test-verification-token-12345",
  }

  try {
    const response = await fetch(N8N_WEBHOOK_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(verificationPayload),
    })

    console.log(`   Status: ${response.status} ${response.statusText}`)
    const responseText = await response.text()
    console.log(`   Response: ${responseText}`)
    
    if (response.ok) {
      const responseJson = JSON.parse(responseText)
      if (responseJson.verification_token === verificationPayload.verification_token) {
        console.log("   ✅ Verification token handling works correctly\n")
      } else {
        console.log("   ⚠️  Verification token not returned correctly\n")
      }
    } else {
      console.log(`   ⚠️  Verification request returned non-200 status\n`)
    }
  } catch (error: any) {
    console.error(`   ❌ Error testing verification: ${error.message}\n`)
  }
}

async function main() {
  console.log("=".repeat(60))
  console.log("Notion Webhook Flow Test")
  console.log("=".repeat(60))
  console.log()

  await testN8nWebhook()
  await testApiWebhook()
  await testVerificationToken()

  console.log("=".repeat(60))
  console.log("\n💡 Next Steps:")
  console.log("   1. Check n8n execution logs for any errors")
  console.log("   2. Verify Notion webhook subscription event types:")
  console.log("      - database.content_updated")
  console.log("      - page.properties_updated")
  console.log("   3. Check if Notion shows any webhook delivery failures")
  console.log("   4. Try deleting and recreating the webhook subscription")
}

main().catch(console.error)
