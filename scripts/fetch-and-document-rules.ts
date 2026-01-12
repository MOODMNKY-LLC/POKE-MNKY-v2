/**
 * Safe script to fetch and document rules from Google Sheet
 * Uses small chunks to avoid crashes
 */

import { getGoogleServiceAccountCredentials } from "../lib/utils/google-sheets"
import { writeFile } from "fs/promises"
import { join } from "path"

async function fetchAndDocumentRules() {
  // Load environment variables
  require("dotenv").config({ path: ".env.local" })
  
  const spreadsheetId = "1wwH5XUHxQnivm90wGtNLQI_g7P3nPi5ZRcbZ3JU3-YQ"
  const sheetName = "Rules"

  console.log("=".repeat(70))
  console.log("📋 Fetching and Documenting Rules")
  console.log("=".repeat(70))
  console.log(`📊 Spreadsheet ID: ${spreadsheetId}`)
  console.log(`📋 Sheet: ${sheetName}\n`)

  try {
    const credentials = getGoogleServiceAccountCredentials()
    if (!credentials) {
      throw new Error("Google Sheets credentials not configured. Check .env.local")
    }

    const { google } = await import("googleapis")
    const { JWT } = await import("google-auth-library")
    const serviceAccountAuth = new JWT({
      email: credentials.email,
      key: credentials.privateKey,
      scopes: ["https://www.googleapis.com/auth/spreadsheets.readonly"],
    })

    const sheets = google.sheets({ version: "v4", auth: serviceAccountAuth })

    // First, get sheet metadata
    const spreadsheet = await sheets.spreadsheets.get({
      spreadsheetId,
    })

    const sheet = spreadsheet.data.sheets?.find((s) => s.properties?.title === sheetName)
    if (!sheet) {
      throw new Error(`Sheet "${sheetName}" not found`)
    }

    const rowCount = sheet.properties?.gridProperties?.rowCount || 0
    const colCount = sheet.properties?.gridProperties?.columnCount || 0

    console.log(`✅ Sheet found: ${rowCount} rows, ${colCount} columns\n`)

    // Read sheet in small chunks to avoid crashes
    const chunkSize = 50
    const maxRows = Math.min(rowCount, 500) // Limit to 500 rows max
    const allRows: Array<{ row: number; data: any[] }> = []

    console.log(`📖 Reading rows in chunks of ${chunkSize}...`)

    for (let startRow = 0; startRow < maxRows; startRow += chunkSize) {
      const endRow = Math.min(startRow + chunkSize, maxRows)
      const range = `${sheetName}!A${startRow + 1}:Z${endRow}`

      try {
        const response = await sheets.spreadsheets.values.get({
          spreadsheetId,
          range,
        })

        const values = response.data.values || []
        for (let i = 0; i < values.length; i++) {
          allRows.push({
            row: startRow + i + 1,
            data: values[i] || [],
          })
        }

        console.log(`  ✓ Read rows ${startRow + 1}-${endRow}`)
        
        // Small delay to avoid rate limits
        await new Promise((resolve) => setTimeout(resolve, 100))
      } catch (error: any) {
        console.warn(`  ⚠️ Failed to read rows ${startRow + 1}-${endRow}: ${error.message}`)
      }
    }

    console.log(`\n✅ Read ${allRows.length} rows total\n`)

    // Structure the rules content
    const rulesContent: string[] = []
    let currentSection = ""
    let currentSubsection = ""

    for (const rowData of allRows) {
      const row = rowData.data || []
      const firstCell = String(row[0] || "").trim()
      const secondCell = String(row[1] || "").trim()

      // Detect section headers (usually bold/large text in first column)
      if (firstCell && firstCell.length > 0 && firstCell.length < 100) {
        // Check if it looks like a section header
        const isHeader =
          firstCell.match(/^[A-Z][A-Z\s]+$/) || // All caps
          firstCell.match(/^[0-9]+\.\s+[A-Z]/) || // Numbered
          firstCell.match(/^[A-Z][a-z]+\s+[A-Z]/) || // Title Case
          (firstCell.length > 5 && firstCell.length < 50 && !secondCell)

        if (isHeader && !firstCell.match(/^\d+$/) && !firstCell.match(/^[a-z]+$/)) {
          if (currentSection) {
            rulesContent.push("") // Blank line between sections
          }
          currentSection = firstCell
          rulesContent.push(`## ${currentSection}`)
          rulesContent.push("")
          currentSubsection = ""
          continue
        }
      }

      // Detect subsections (indented or second column)
      if (secondCell && secondCell.length > 0 && !firstCell) {
        if (currentSubsection !== secondCell) {
          currentSubsection = secondCell
          rulesContent.push(`### ${currentSubsection}`)
          rulesContent.push("")
        }
      }

      // Add content
      const contentCells = row.filter((cell) => {
        const value = String(cell || "").trim()
        return value.length > 0 && !value.match(/^\d+$/)
      })

      if (contentCells.length > 0) {
        const content = contentCells.join(" | ").trim()
        if (content && content !== currentSection && content !== currentSubsection) {
          rulesContent.push(content)
        }
      }
    }

    // Create comprehensive markdown document
    const markdown = `# League Rules Documentation

> **Source**: [Google Sheet](https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit)
> **Last Updated**: ${new Date().toISOString().split("T")[0]}
> **Sheet**: ${sheetName}

---

${rulesContent.join("\n")}

---

## Notes

- This document is auto-generated from the Google Sheet
- Rules may be updated in the sheet - re-run documentation script to update
- For questions or clarifications, refer to the original sheet

---

**Generated by**: POKE-MNKY Rules Documentation Script
`

    // Ensure docs directory exists
    const docsDir = join(process.cwd(), "docs")
    try {
      await import("fs").then((fs) => {
        if (!fs.existsSync(docsDir)) {
          fs.mkdirSync(docsDir, { recursive: true })
        }
      })
    } catch {
      // Directory might already exist
    }

    // Write markdown file
    const docsPath = join(docsDir, "LEAGUE-RULES.md")
    await writeFile(docsPath, markdown, "utf-8")
    console.log(`✅ Rules documented: ${docsPath}`)

    // Create AI context file (simplified version for AI reference)
    const aiContext = `# League Rules - AI Context

This file provides contextual awareness of league rules for AI assistants.

## Key Rules Summary

${rulesContent.slice(0, 50).join("\n")}

---

**Full Documentation**: See \`docs/LEAGUE-RULES.md\` for complete rules.

**Source**: Google Sheet - Rules tab
`

    const contextPath = join(process.cwd(), ".cursor", "rules", "league-rules.mdc")
    await writeFile(contextPath, aiContext, "utf-8")
    console.log(`✅ AI context file created: ${contextPath}`)

    console.log("\n" + "=".repeat(70))
    console.log("✅ Rules Documentation Complete")
    console.log("=".repeat(70))
  } catch (error) {
    console.error("❌ Error:", error)
    process.exit(1)
  }
}

fetchAndDocumentRules()
