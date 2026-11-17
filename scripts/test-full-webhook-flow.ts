/**
 * Test Full Webhook Flow
 * 
 * Tests the complete flow with a proper Notion-like payload
 */

import { config } from "dotenv"
import crypto from "crypto"

config({ path: ".env.local" })

const N8N_WEBHOOK_URL = "https://aab-n8n.moodmnky.com/webhook/notion-draft-board"
const API_WEBHOOK_URL = "https://poke-mnky.moodmnky.com/api/webhooks/notion"
const WEBHOOK_SECRET = process.env.NOTION_WEBHOOK_SECRET
if (!WEBHOOK_SECRET) {
  console.error("NOTION_WEBHOOK_SECRET is required (set it in .env.local). Refusing to run without it.")
  process.exit(1)
}

// Create a proper Notion webhook payload
const mockNotionWebhook = {
  type: "database.content_updated",
  data: {
    database_id: "5e58ccd73ceb44ed83de826b51cf5c36",
  },
}

// Generate a proper Notion signature
function generateNotionSignature(body: string, secret: string): string {
  const hmac = crypto.createHmac("sha256", secret)
  hmac.update(body)
  return `sha256=${hmac.digest("hex")}`
}

async function testN8nWithSignature() {
  console.log("🧪 Testing n8n Webhook with Proper Notion Signature...")
  console.log(`   URL: ${N8N_WEBHOOK_URL}\n`)

  const body = JSON.stringify(mockNotionWebhook)
  const signature = generateNotionSignature(body, WEBHOOK_SECRET)

  try {
    const response = await fetch(N8N_WEBHOOK_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-notion-signature": signature,
      },
      body,
    })

    console.log(`   Status: ${response.status} ${response.statusText}`)
    const responseText = await response.text()
    console.log(`   Response: ${responseText}`)
    
    if (response.ok) {
      console.log("   ✅ n8n webhook processed successfully\n")
      return true
    } else {
      console.log(`   ⚠️  n8n webhook returned non-200 status\n`)
      return false
    }
  } catch (error: any) {
    console.error(`   ❌ Error: ${error.message}\n`)
    return false
  }
}

async function testApiWithSignature() {
  console.log("🧪 Testing API Webhook with Proper Notion Signature...")
  console.log(`   URL: ${API_WEBHOOK_URL}\n`)

  const body = JSON.stringify(mockNotionWebhook)
  const signature = generateNotionSignature(body, WEBHOOK_SECRET)

  try {
    const response = await fetch(API_WEBHOOK_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-notion-signature": signature,
      },
      body,
    })

    console.log(`   Status: ${response.status} ${response.statusText}`)
    const responseText = await response.text()
    console.log(`   Response: ${responseText.substring(0, 200)}`)
    
    if (response.ok) {
      console.log("   ✅ API webhook processed successfully\n")
      return true
    } else {
      console.log(`   ⚠️  API webhook returned non-200 status\n`)
      return false
    }
  } catch (error: any) {
    console.error(`   ❌ Error: ${error.message}\n`)
    return false
  }
}

async function testVerificationToken() {
  console.log("🧪 Testing Verification Token Handling...")
  console.log(`   URL: ${N8N_WEBHOOK_URL}\n`)

  const verificationPayload = {
    verification_token: "test-verification-token-12345",
  }
  const body = JSON.stringify(verificationPayload)

  try {
    const response = await fetch(N8N_WEBHOOK_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body,
    })

    console.log(`   Status: ${response.status} ${response.statusText}`)
    const responseText = await response.text()
    console.log(`   Response: ${responseText}`)
    
    if (response.ok) {
      try {
        const responseJson = JSON.parse(responseText)
        if (responseJson.verification_token === verificationPayload.verification_token) {
          console.log("   ✅ Verification token handling works correctly\n")
          return true
        } else {
          console.log("   ⚠️  Verification token not returned correctly\n")
          return false
        }
      } catch {
        console.log("   ⚠️  Response is not valid JSON\n")
        return false
      }
    } else {
      console.log(`   ⚠️  Verification request returned non-200 status\n`)
      return false
    }
  } catch (error: any) {
    console.error(`   ❌ Error: ${error.message}\n`)
    return false
  }
}

async function main() {
  console.log("=".repeat(60))
  console.log("Full Webhook Flow Test")
  console.log("=".repeat(60))
  console.log()

  const results = {
    n8n: await testN8nWithSignature(),
    api: await testApiWithSignature(),
    verification: await testVerificationToken(),
  }

  console.log("=".repeat(60))
  console.log("\n📊 Test Results:")
  console.log(`   n8n Webhook: ${results.n8n ? "✅ PASS" : "❌ FAIL"}`)
  console.log(`   API Webhook: ${results.api ? "✅ PASS" : "❌ FAIL"}`)
  console.log(`   Verification: ${results.verification ? "✅ PASS" : "❌ FAIL"}`)

  console.log("\n💡 Next Steps:")
  if (!results.n8n) {
    console.log("   - Check n8n execution logs for errors")
    console.log("   - Verify workflow is active and webhook is registered")
  }
  if (!results.api) {
    console.log("   - Verify NOTION_WEBHOOK_SECRET is set in Vercel")
    console.log("   - Check Vercel deployment logs")
  }
  if (!results.verification) {
    console.log("   - Verification token handling needs to be fixed in workflow")
  }
  console.log("\n   - Make a test change in Notion Draft Board")
  console.log("   - Check n8n executions immediately after")
  console.log("   - Check Vercel logs for API calls")
}

main().catch(console.error)
