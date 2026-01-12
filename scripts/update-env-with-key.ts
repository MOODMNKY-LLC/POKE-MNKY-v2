/**
 * Update .env.local with service account private key from JSON file
 */

import * as fs from "fs"
import * as path from "path"

const jsonPath = path.join(process.cwd(), "temp", "mood-mnky-7d13eb3f5bae.json")
const envLocalPath = path.join(process.cwd(), ".env.local")

// Read JSON file
const json = JSON.parse(fs.readFileSync(jsonPath, "utf-8"))

console.log("📋 Extracted from JSON:")
console.log(`   Email: ${json.client_email}`)
console.log(`   Private Key Length: ${json.private_key.length} characters`)

// Read .env.local
let content = fs.readFileSync(envLocalPath, "utf-8")

// Escape the private key for .env file (replace actual newlines with \n)
const privateKey = json.private_key.replace(/\n/g, "\\n")

// Check if GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY already exists
if (content.includes("GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY=")) {
  // Update existing
  content = content.replace(
    /GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY=.*/g,
    `GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY="${privateKey}"`
  )
  console.log("✅ Updated existing GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY")
} else {
  // Add new
  content += `\nGOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY="${privateKey}"\n`
  console.log("✅ Added GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY")
}

// Write back to .env.local
fs.writeFileSync(envLocalPath, content)

console.log("✅ Successfully updated .env.local")
console.log("\n📋 Verification:")
console.log(`   Email: ${json.client_email}`)
console.log(`   Private Key: Set (${privateKey.length} characters)`)
