/**
 * Simple script to fetch rules and create documentation
 * Uses raw API with small chunks to avoid crashes
 * No heavy AI processing - just structure the data
 */

import { getGoogleServiceAccountCredentials } from "../lib/utils/google-sheets"
import { writeFile } from "fs/promises"
import { join } from "path"
import { existsSync, mkdirSync } from "fs"

async function fetchRulesSimple() {
  require("dotenv").config({ path: ".env.local" })

  const spreadsheetId = "1sVQD6_CsoYtGmguRhc07IDlnz2V4Q2uWTt8Owpl5JE0"
  const sheetName = "Rules"

  console.log("=".repeat(70))
  console.log("📋 Fetching Rules (Simple & Safe)")
  console.log("=".repeat(70))
  console.log(`📊 Spreadsheet ID: ${spreadsheetId}`)
  console.log(`📋 Sheet: ${sheetName}\n`)

  try {
    const credentials = getGoogleServiceAccountCredentials()
    if (!credentials) {
      throw new Error("Google Sheets credentials not configured")
    }

    const { google } = await import("googleapis")
    const { JWT } = await import("google-auth-library")
    const serviceAccountAuth = new JWT({
      email: credentials.email,
      key: credentials.privateKey,
      scopes: ["https://www.googleapis.com/auth/spreadsheets.readonly"],
    })

    const sheets = google.sheets({ version: "v4", auth: serviceAccountAuth })

    // Get sheet metadata first
    const spreadsheet = await sheets.spreadsheets.get({ spreadsheetId })
    const sheet = spreadsheet.data.sheets?.find((s) => s.properties?.title === sheetName)
    if (!sheet) {
      throw new Error(`Sheet "${sheetName}" not found`)
    }

    const rowCount = sheet.properties?.gridProperties?.rowCount || 0
    const maxRows = Math.min(rowCount, 200) // Limit to 200 rows

    console.log(`✅ Sheet found: ${rowCount} rows\n`)
    console.log(`📖 Reading rows 1-${maxRows} in small chunks...\n`)

    // Read in small chunks
    const chunkSize = 30
    const allRows: Array<{ row: number; data: any[] }> = []

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

        console.log(`  ✓ Rows ${startRow + 1}-${endRow}`)
        await new Promise((resolve) => setTimeout(resolve, 200)) // Small delay
      } catch (error: any) {
        console.warn(`  ⚠️ Failed rows ${startRow + 1}-${endRow}: ${error.message}`)
      }
    }

    console.log(`\n✅ Read ${allRows.length} rows total\n`)

    // Structure the content into markdown
    const sections: Array<{ title: string; content: string[] }> = []
    let currentSection: { title: string; content: string[] } | null = null

    for (const rowData of allRows) {
      const row = rowData.data || []
      const firstCell = String(row[0] || "").trim()
      const secondCell = String(row[1] || "").trim()

      // Detect section headers (non-empty first cell, might be bold/large)
      if (firstCell && firstCell.length > 2 && firstCell.length < 100) {
        // Check if it looks like a header
        const isHeader =
          !firstCell.match(/^\d+$/) && // Not just a number
          !firstCell.match(/^[a-z]+$/) && // Not all lowercase
          (firstCell[0] === firstCell[0].toUpperCase() || // Starts with capital
            firstCell.match(/^[A-Z]/)) && // Or all caps
          (!secondCell || secondCell.length === 0) // Second cell empty

        if (isHeader) {
          // Save previous section
          if (currentSection && currentSection.content.length > 0) {
            sections.push(currentSection)
          }
          // Start new section
          currentSection = {
            title: firstCell,
            content: [],
          }
          continue
        }
      }

      // Add content to current section or create default
      if (!currentSection) {
        currentSection = {
          title: "Introduction",
          content: [],
        }
      }

      // Collect non-empty cells
      const contentCells = row
        .map((cell) => String(cell || "").trim())
        .filter((cell) => cell.length > 0 && !cell.match(/^\d+$/))

      if (contentCells.length > 0) {
        const content = contentCells.join(" | ")
        if (content && content !== currentSection.title) {
          currentSection.content.push(content)
        }
      }
    }

    // Save last section
    if (currentSection && currentSection.content.length > 0) {
      sections.push(currentSection)
    }

    console.log(`✅ Structured into ${sections.length} sections\n`)

    // Generate markdown
    const markdown = generateMarkdown(sections, spreadsheetId)
    
    // Ensure docs directory exists
    const docsDir = join(process.cwd(), "docs")
    if (!existsSync(docsDir)) {
      mkdirSync(docsDir, { recursive: true })
    }

    const docsPath = join(docsDir, "LEAGUE-RULES.md")
    await writeFile(docsPath, markdown, "utf-8")
    console.log(`✅ Rules documented: ${docsPath}`)

    // Create AI context file
    const aiContext = generateAIContext(sections)
    const contextDir = join(process.cwd(), ".cursor", "rules")
    if (!existsSync(contextDir)) {
      mkdirSync(contextDir, { recursive: true })
    }

    const contextPath = join(contextDir, "league-rules.mdc")
    await writeFile(contextPath, aiContext, "utf-8")
    console.log(`✅ AI context file created: ${contextPath}`)

    console.log("\n" + "=".repeat(70))
    console.log("✅ Rules Documentation Complete")
    console.log("=".repeat(70))
  } catch (error: any) {
    console.error("❌ Error:", error.message)
    process.exit(1)
  }
}

function generateMarkdown(sections: Array<{ title: string; content: string[] }>, spreadsheetId: string): string {
  const sectionsMarkdown = sections.map((section) => {
    let sectionMd = `## ${section.title}\n\n`
    
    // Format content
    for (const line of section.content) {
      // Check if it's a bullet point or list item
      if (line.match(/^[-•*]\s/) || line.match(/^\d+\.\s/)) {
        sectionMd += `${line}\n`
      } else if (line.includes("|")) {
        // Table row
        sectionMd += `${line}\n`
      } else {
        // Regular paragraph
        sectionMd += `${line}\n\n`
      }
    }

    return sectionMd
  }).join("\n---\n\n")

  return `# League Rules Documentation

> **Source**: [Google Sheet - Rules Tab](https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit)
> **Alternative Source**: [Standalone Rules Sheet](https://docs.google.com/spreadsheets/d/1wwH5XUHxQnivm90wGtNLQI_g7P3nPi5ZRcbZ3JU3-YQ/edit)
> **Last Updated**: ${new Date().toISOString().split("T")[0]}
> **Sections**: ${sections.length}

---

## Overview

This document contains the comprehensive league rules for the Average at Best Draft League. Rules are extracted from the Google Sheet and documented here for reference and AI contextual awareness.

---

${sectionsMarkdown}

---

## Draft Board & Point System (Key Rules)

### Draft Board Structure
- **Row 3**: Contains point value headers (e.g., "20 Points", "19 Points", "18 Points")
- **Column Pattern**: Headers at columns J, M, P, S, V, Y, AB, AE, AG (every 3 columns)
- **Pokemon Location**: Pokemon appear in these columns starting at row 5
- **Drafted Pokemon**: Removed/struck out when drafted

### Point Values
- Point values range from **20 points** (highest tier) down to **12 points** (lowest tier)
- Each team has a **total budget of 120 points**
- Point values determine draft order: Higher points = earlier draft position

### Draft Process
1. **Snake Draft Format**: Teams pick in reverse order each round
2. **Point Spending**: Each pick costs the Pokemon's point value
3. **Budget Tracking**: Teams must stay within their 120-point budget
4. **Draft Board Updates**: Once drafted, Pokemon removed/struck out

---

## Team Structure

### Team Pages Format
- **A1:B1**: Team name header
- **A2:B2**: Team name value
- **A3:B3**: Coach name header  
- **A4:B4**: Coach name value
- **Columns C1:C11**: Draft picks with point values
- **Column D**: Pokemon drafted
- **Column E**: Pokemon point value

### Team Rosters
- Teams draft **11 Pokemon** total
- Each Pokemon has an associated point value
- Total roster cost must not exceed 120 points

---

## Notes

- This document is extracted from the Google Sheet
- Rules may be updated in the sheet - re-run script to update
- For questions, refer to the original sheet
- Full rules are stored in \`league_config\` table when parsed with AI

---

**Generated by**: POKE-MNKY Rules Documentation System
`
}

function generateAIContext(sections: Array<{ title: string; content: string[] }>): string {
  const summary = sections.map((section) => {
    let sectionMd = `### ${section.title}\n\n`
    
    // Include first few content items
    const preview = section.content.slice(0, 5).join("\n")
    if (preview.length > 600) {
      sectionMd += `${preview.substring(0, 600)}...\n\n`
    } else {
      sectionMd += `${preview}\n\n`
    }
    
    return sectionMd
  }).join("\n---\n\n")

  return `---
description: League Rules - AI Context for POKE MNKY
globs: 
alwaysApply: true
---

# League Rules - AI Context

This file provides contextual awareness of league rules for AI assistants working on POKE MNKY.

> **Source**: Google Sheet - Rules tab
> **Last Updated**: ${new Date().toISOString().split("T")[0]}

---

## Key Rules Summary

${summary}

---

## Critical Rules for AI Decision-Making

### Draft Board & Point System
- **Point Values**: Range from 20 (highest) to 12 (lowest) points
- **Budget**: Each team has 120 points total
- **Draft Format**: Snake draft with point-based selection
- **Draft Board Structure**: Row 3 has point headers, Pokemon start at row 5
- **Drafted Pokemon**: Removed/struck out from board when drafted

### Team Structure
- **Roster Size**: 11 Pokemon per team
- **Team Pages**: Structured format (A2:B2 = team name, A4:B4 = coach, C-E = picks)
- **Point Tracking**: Stored in \`draft_budgets\` table per team per season
- **Team Names**: Use actual names from Team Pages, not point-based names

### Battle Format
- **Format**: 6v6 Singles
- **Scoring**: Wins/losses tracked with differential
- **Standings**: Based on record and point differential

### League Structure
- **Conferences**: Lance Conference, Leon Conference
- **Divisions**: Kanto, Johto, Hoenn, Sinnoh
- **Seasons**: Tracked with start/end dates and current flag

---

## AI Decision Guidelines

When making decisions about:
- **Draft Picks**: Always check point values and remaining budget (120 points total)
- **Team Creation**: Use actual team names from Team Pages, not point-based names like "Team X Points"
- **Point Validation**: Warn if picks exceed remaining budget, but allow (non-blocking)
- **Match Scheduling**: Follow conference/division structure
- **Standings**: Calculate based on wins, losses, and differential
- **Draft Board Updates**: Remove/strike out Pokemon when drafted

---

## Database Schema Reference

- **\`league_config\`**: Stores parsed rules sections (when AI parsing succeeds)
- **\`draft_budgets\`**: Tracks point spending (120 total, spent_points, remaining_points)
- **\`team_rosters\`**: Draft picks with \`draft_points\` field
- **\`teams\`**: Team information with division/conference

---

**Full Documentation**: See \`docs/LEAGUE-RULES.md\` for complete rules.

**Database Query**: \`SELECT * FROM league_config WHERE config_type = 'rules'\`
`
}

fetchRulesSimple()
