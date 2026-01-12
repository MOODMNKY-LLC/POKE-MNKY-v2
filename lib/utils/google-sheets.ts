/**
 * Utility functions for Google Sheets integration
 */

/**
 * Extract spreadsheet ID from Google Sheets URL or return as-is if already an ID
 * 
 * @param input - Google Sheets URL or spreadsheet ID
 * @returns Spreadsheet ID
 * 
 * @example
 * extractSpreadsheetId("https://docs.google.com/spreadsheets/d/1abc123/edit")
 * // Returns: "1abc123"
 * 
 * extractSpreadsheetId("1abc123")
 * // Returns: "1abc123"
 */
export function extractSpreadsheetId(input: string): string | null {
  if (!input || typeof input !== "string") {
    return null
  }

  // Remove whitespace
  const trimmed = input.trim()

  // If it's already just an ID (alphanumeric with dashes/underscores, no slashes)
  if (/^[a-zA-Z0-9_-]+$/.test(trimmed)) {
    return trimmed
  }

  // Try to extract from URL
  // Matches: /spreadsheets/d/{ID}/ or /spreadsheets/d/{ID}#
  const urlPattern = /\/spreadsheets\/d\/([a-zA-Z0-9_-]+)/
  const match = trimmed.match(urlPattern)

  if (match && match[1]) {
    return match[1]
  }

  // If no match, return null
  return null
}

/**
 * Validate spreadsheet ID format
 */
export function isValidSpreadsheetId(id: string): boolean {
  return /^[a-zA-Z0-9_-]+$/.test(id)
}

/**
 * Get Google Sheets service account credentials from environment variables
 * 
 * Supports multiple variable name formats for backward compatibility:
 * - GOOGLE_SERVICE_ACCOUNT_EMAIL / GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY (preferred)
 * - GOOGLE_SERVICE_ACCOUNT_EMAIL / GOOGLE_PRIVATE_KEY (legacy)
 * 
 * @returns Object with email and private key, or null if not configured
 */
export function getGoogleServiceAccountCredentials(): {
  email: string
  privateKey: string
} | null {
  // Check for email (only one name used)
  const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL

  // Check for private key (support both naming conventions)
  const privateKey =
    process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY || process.env.GOOGLE_PRIVATE_KEY

  if (!email || !privateKey) {
    // Debug logging to help identify missing variables
    if (process.env.NODE_ENV === "development") {
      console.log("[Google Sheets] Credential check:", {
        email: email ? "✓ Found" : "✗ Missing GOOGLE_SERVICE_ACCOUNT_EMAIL",
        privateKey: privateKey
          ? "✓ Found"
          : "✗ Missing GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY or GOOGLE_PRIVATE_KEY",
        foundEnvVars: Object.keys(process.env)
          .filter((key) => key.includes("GOOGLE") && key.includes("SERVICE"))
          .concat(Object.keys(process.env).filter((key) => key.includes("GOOGLE_PRIVATE"))),
      })
    }
    return null
  }

  return {
    email,
    privateKey: privateKey.replace(/\\n/g, "\n"),
  }
}

/**
 * Check if Google Sheets credentials are configured
 * 
 * Supports both naming conventions for backward compatibility
 */
export function hasGoogleSheetsCredentials(): boolean {
  const hasEmail = !!process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL
  const hasPrivateKey =
    !!process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY || !!process.env.GOOGLE_PRIVATE_KEY

  return hasEmail && hasPrivateKey
}
