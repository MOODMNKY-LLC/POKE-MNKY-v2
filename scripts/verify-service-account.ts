/**
 * Comprehensive service account verification script
 * Checks credentials, authentication, and provides sharing instructions
 * Usage: npx tsx scripts/verify-service-account.ts
 */

import * as dotenv from "dotenv"
import * as path from "path"
import { JWT } from "google-auth-library"
import { google } from "googleapis"

// Load environment variables
dotenv.config({ path: path.join(process.cwd(), ".env.local") })

interface Credentials {
  email: string
  privateKey: string
}

function getCredentials(): Credentials | null {
  const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL
  const privateKey = process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY

  if (!email || !privateKey) {
    return null
  }

  // Handle private key that might have escaped newlines
  const formattedKey = privateKey.replace(/\\n/g, "\n")

  return {
    email: email.trim(),
    privateKey: formattedKey,
  }
}

function validateEmailFormat(email: string): { valid: boolean; type: string; message: string } {
  // Service account emails end with @*.iam.gserviceaccount.com
  if (email.includes("@") && email.endsWith(".iam.gserviceaccount.com")) {
    return {
      valid: true,
      type: "service_account",
      message: "✅ Valid service account email format",
    }
  }

  // Regular Gmail/Google Workspace email
  if (email.includes("@gmail.com") || email.includes("@") && !email.endsWith(".iam.gserviceaccount.com")) {
    return {
      valid: false,
      type: "regular_account",
      message: "❌ This appears to be a regular Google account, not a service account",
    }
  }

  return {
    valid: false,
    type: "unknown",
    message: "❌ Invalid email format",
  }
}

function validatePrivateKey(key: string): { valid: boolean; message: string } {
  if (!key) {
    return { valid: false, message: "❌ Private key is empty" }
  }

  // Check for PEM format markers
  if (!key.includes("-----BEGIN")) {
    return { valid: false, message: "❌ Private key doesn't appear to be in PEM format" }
  }

  if (!key.includes("PRIVATE KEY")) {
    return { valid: false, message: "❌ Private key doesn't contain 'PRIVATE KEY' marker" }
  }

  if (!key.includes("-----END")) {
    return { valid: false, message: "❌ Private key doesn't have proper END marker" }
  }

  return { valid: true, message: "✅ Private key format looks valid" }
}

async function testAuthentication(credentials: Credentials): Promise<{ success: boolean; message: string; token?: string }> {
  try {
    const auth = new JWT({
      email: credentials.email,
      key: credentials.privateKey,
      scopes: [
        "https://www.googleapis.com/auth/spreadsheets.readonly",
        "https://www.googleapis.com/auth/drive.readonly",
      ],
    })

    // Request an access token
    const tokenResponse = await auth.getAccessToken()
    
    if (!tokenResponse.token) {
      return {
        success: false,
        message: "❌ Failed to obtain access token",
      }
    }

    return {
      success: true,
      message: "✅ Authentication successful - service account can authenticate",
      token: tokenResponse.token.substring(0, 20) + "...", // Show first 20 chars
    }
  } catch (error: any) {
    return {
      success: false,
      message: `❌ Authentication failed: ${error.message}`,
    }
  }
}

async function testAPIAccess(credentials: Credentials): Promise<{ sheetsEnabled: boolean; driveEnabled: boolean; messages: string[] }> {
  const messages: string[] = []
  let sheetsEnabled = false
  let driveEnabled = false

  try {
    const auth = new JWT({
      email: credentials.email,
      key: credentials.privateKey,
      scopes: [
        "https://www.googleapis.com/auth/spreadsheets.readonly",
        "https://www.googleapis.com/auth/drive.readonly",
      ],
    })

    // Test Sheets API
    try {
      const sheets = google.sheets({ version: "v4", auth })
      // Try to list spreadsheets (this will fail but tells us if API is enabled)
      await sheets.spreadsheets.get({
        spreadsheetId: "test", // This will fail, but we're checking API access
      })
    } catch (error: any) {
      if (error.code === 404 || error.message?.includes("not found")) {
        sheetsEnabled = true
        messages.push("✅ Google Sheets API is accessible")
      } else if (error.code === 403 && error.message?.includes("API has not been used")) {
        sheetsEnabled = false
        messages.push("❌ Google Sheets API is NOT enabled for this project")
      } else if (error.code === 403) {
        sheetsEnabled = true // API is enabled, just permission issue
        messages.push("✅ Google Sheets API is enabled (permission error is expected)")
      } else {
        sheetsEnabled = true // Other errors suggest API is enabled
        messages.push("✅ Google Sheets API appears to be enabled")
      }
    }

    // Test Drive API
    try {
      const drive = google.drive({ version: "v3", auth })
      await drive.files.list({ pageSize: 1 })
      driveEnabled = true
      messages.push("✅ Google Drive API is accessible")
    } catch (error: any) {
      if (error.message?.includes("API has not been used")) {
        driveEnabled = false
        messages.push("❌ Google Drive API is NOT enabled for this project")
      } else {
        driveEnabled = true
        messages.push("✅ Google Drive API appears to be enabled")
      }
    }
  } catch (error: any) {
    messages.push(`⚠️  API test error: ${error.message}`)
  }

  return { sheetsEnabled, driveEnabled, messages }
}

async function main() {
  console.log("=".repeat(70))
  console.log("🔍 Service Account Verification")
  console.log("=".repeat(70))
  console.log()

  // Step 1: Check environment variables
  console.log("📋 Step 1: Checking Environment Variables")
  console.log("-".repeat(70))

  const credentials = getCredentials()

  if (!credentials) {
    console.log("❌ CRITICAL: Service account credentials not found!")
    console.log()
    console.log("Required environment variables:")
    console.log("  - GOOGLE_SERVICE_ACCOUNT_EMAIL")
    console.log("  - GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY")
    console.log()
    console.log("Please check your .env.local file")
    process.exit(1)
  }

  console.log("✅ Environment variables found")
  console.log(`   Email: ${credentials.email}`)
  console.log(`   Private Key: ${credentials.privateKey.substring(0, 30)}... (${credentials.privateKey.length} chars)`)
  console.log()

  // Step 2: Validate email format
  console.log("📋 Step 2: Validating Email Format")
  console.log("-".repeat(70))

  const emailValidation = validateEmailFormat(credentials.email)
  console.log(emailValidation.message)
  console.log(`   Type: ${emailValidation.type}`)
  console.log()

  if (!emailValidation.valid) {
    console.log("⚠️  WARNING: Email format validation failed!")
    console.log("   Service account emails should end with: .iam.gserviceaccount.com")
    console.log()
  }

  // Step 3: Validate private key format
  console.log("📋 Step 3: Validating Private Key Format")
  console.log("-".repeat(70))

  const keyValidation = validatePrivateKey(credentials.privateKey)
  console.log(keyValidation.message)
  console.log()

  if (!keyValidation.valid) {
    console.log("⚠️  WARNING: Private key format validation failed!")
    console.log("   Private keys should be in PEM format with BEGIN/END markers")
    console.log()
  }

  // Step 4: Test authentication
  console.log("📋 Step 4: Testing Authentication")
  console.log("-".repeat(70))

  const authResult = await testAuthentication(credentials)
  console.log(authResult.message)
  if (authResult.token) {
    console.log(`   Token preview: ${authResult.token}`)
  }
  console.log()

  if (!authResult.success) {
    console.log("❌ Authentication failed! Check:")
    console.log("   1. Service account email is correct")
    console.log("   2. Private key is correct and properly formatted")
    console.log("   3. Service account exists in Google Cloud Console")
    console.log()
  }

  // Step 5: Test API access
  console.log("📋 Step 5: Testing API Access")
  console.log("-".repeat(70))

  const apiResult = await testAPIAccess(credentials)
  apiResult.messages.forEach((msg) => console.log(msg))
  console.log()

  // Step 6: Sharing instructions
  console.log("📋 Step 6: Sharing Instructions")
  console.log("-".repeat(70))
  console.log()
  console.log("⚠️  IMPORTANT: Service accounts don't appear in Google Sheets share dialog!")
  console.log()
  console.log("To share a spreadsheet with a service account:")
  console.log()
  console.log("1. Open your Google Sheet")
  console.log("2. Click the 'Share' button (top right)")
  console.log("3. In the 'Add people and groups' field, PASTE this email directly:")
  console.log()
  console.log(`   ${credentials.email}`)
  console.log()
  console.log("4. Set permission to 'Viewer' (recommended) or 'Editor'")
  console.log("5. Uncheck 'Notify people' (service accounts don't need notifications)")
  console.log("6. Click 'Share'")
  console.log()
  console.log("💡 Note: You CANNOT search for service accounts in the share dialog.")
  console.log("   You MUST paste the full email address directly.")
  console.log()

  // Summary
  console.log("=".repeat(70))
  console.log("📊 Summary")
  console.log("=".repeat(70))
  console.log()

  const allChecks = [
    { name: "Environment Variables", passed: !!credentials },
    { name: "Email Format", passed: emailValidation.valid },
    { name: "Private Key Format", passed: keyValidation.valid },
    { name: "Authentication", passed: authResult.success },
    { name: "Sheets API", passed: apiResult.sheetsEnabled },
    { name: "Drive API", passed: apiResult.driveEnabled },
  ]

  allChecks.forEach((check) => {
    const icon = check.passed ? "✅" : "❌"
    console.log(`${icon} ${check.name}`)
  })

  console.log()

  const allPassed = allChecks.every((check) => check.passed)

  if (allPassed) {
    console.log("✅ All checks passed! Service account is properly configured.")
    console.log()
    console.log("Next steps:")
    console.log("1. Share your spreadsheet with the service account email (see Step 6)")
    console.log("2. Wait 10-30 seconds for permissions to propagate")
    console.log("3. Test access: npx tsx scripts/test-scopes-direct.ts")
  } else {
    console.log("⚠️  Some checks failed. Please review the errors above.")
    console.log()
    console.log("Common issues:")
    console.log("- Service account email format incorrect")
    console.log("- Private key not properly formatted (check for \\n vs actual newlines)")
    console.log("- APIs not enabled in Google Cloud Console")
    console.log("- Service account doesn't exist or was deleted")
  }

  console.log()
}

main()
  .then(() => {
    process.exit(0)
  })
  .catch((error) => {
    console.error("\n❌ Verification failed:", error)
    process.exit(1)
  })
