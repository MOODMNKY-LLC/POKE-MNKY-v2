/**
 * Parse and store rules, then generate documentation
 * Uses Rules parser and stores results
 */

import { RulesParser } from "../lib/google-sheets-parsers/rules-parser"
import { getGoogleServiceAccountCredentials } from "../lib/utils/google-sheets"
import { createClient } from "@supabase/supabase-js"
import { writeFile } from "fs/promises"
import { join } from "path"
import { existsSync, mkdirSync } from "fs"

async function storeAndDocumentRules() {
  require("dotenv").config({ path: ".env.local" })

  const spreadsheetId = "1sVQD6_CsoYtGmguRhc07IDlnz2V4Q2uWTt8Owpl5JE0"
  const sheetName = "Rules"

  console.log("=".repeat(70))
  console.log("📋 Storing and Documenting Rules")
  console.log("=".repeat(70))

  try {
    const credentials = getGoogleServiceAccountCredentials()
    if (!credentials) {
      throw new Error("Google Sheets credentials not configured")
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    // Load spreadsheet using JWT auth (same as test-parsers-safe.ts)
    const { GoogleSpreadsheet } = await import("google-spreadsheet")
    const { JWT } = await import("google-auth-library")
    
    const serviceAccountAuth = new JWT({
      email: credentials.email,
      key: credentials.privateKey,
      scopes: [
        "https://www.googleapis.com/auth/spreadsheets.readonly",
        "https://www.googleapis.com/auth/drive.readonly",
      ],
    })

    const doc = new GoogleSpreadsheet(spreadsheetId, serviceAccountAuth)
    await doc.loadInfo()
    const sheet = doc.sheetsByTitle[sheetName]

    if (!sheet) {
      throw new Error(`Sheet "${sheetName}" not found`)
    }

    console.log(`✅ Sheet loaded: ${sheet.rowCount} rows\n`)

    // Create parser and parse
    const parser = new RulesParser(
      sheet,
      supabase,
      {
        parser_type: "rules",
        table_name: "league_config",
        use_ai: true,
        has_headers: true,
      }
    )

    console.log("🔍 Parsing rules with AI (this may take 30-60 seconds)...\n")
    const result = await parser.parse()
    console.log(`✅ Parsed ${result.recordsProcessed} sections\n`)

    // Wait a moment for database writes
    await new Promise((resolve) => setTimeout(resolve, 2000))

    // Fetch stored rules
    const { data: rulesData, error: fetchError } = await supabase
      .from("league_config")
      .select("*")
      .eq("config_type", "rules")
      .order("created_at", { ascending: true })

    if (fetchError) {
      console.error("❌ Error fetching rules:", fetchError)
      return
    }

    if (!rulesData || rulesData.length === 0) {
      console.log("⚠️ No rules found in database. Rules may not have been stored.\n")
      return
    }

    console.log(`✅ Found ${rulesData.length} rule sections in database\n`)

    // Generate documentation
    const markdown = generateMarkdownFromRules(rulesData)
    const docsDir = join(process.cwd(), "docs")
    if (!existsSync(docsDir)) {
      mkdirSync(docsDir, { recursive: true })
    }

    const docsPath = join(docsDir, "LEAGUE-RULES.md")
    await writeFile(docsPath, markdown, "utf-8")
    console.log(`✅ Rules documented: ${docsPath}`)

    // Create AI context file
    const aiContext = generateAIContext(rulesData)
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

function generateMarkdownFromRules(rulesData: any[]): string {
  const sections = rulesData.map((rule) => {
    const subsections = rule.subsections || []
    const tables = rule.embedded_tables || []

    let sectionMarkdown = `## ${rule.section_title}\n\n`
    sectionMarkdown += `**Type**: ${rule.section_type || "general_rules"}\n\n`
    
    if (rule.content) {
      sectionMarkdown += `${rule.content}\n\n`
    }

    if (subsections && subsections.length > 0) {
      for (const subsection of subsections) {
        if (subsection.subsection_title) {
          sectionMarkdown += `### ${subsection.subsection_title}\n\n`
        }
        if (subsection.content) {
          sectionMarkdown += `${subsection.content}\n\n`
        }
        if (subsection.rules && subsection.rules.length > 0) {
          for (const ruleItem of subsection.rules) {
            sectionMarkdown += `- ${ruleItem}\n`
          }
          sectionMarkdown += "\n"
        }
      }
    }

    if (tables && tables.length > 0) {
      for (const table of tables) {
        if (table.table_title) {
          sectionMarkdown += `#### ${table.table_title}\n\n`
        }
        if (table.headers && table.headers.length > 0) {
          sectionMarkdown += `| ${table.headers.join(" | ")} |\n`
          sectionMarkdown += `| ${table.headers.map(() => "---").join(" | ")} |\n`
          if (table.rows && table.rows.length > 0) {
            for (const row of table.rows) {
              sectionMarkdown += `| ${row.join(" | ")} |\n`
            }
          }
          sectionMarkdown += "\n"
        }
      }
    }

    return sectionMarkdown
  }).join("\n---\n\n")

  return `# League Rules Documentation

> **Source**: [Google Sheet - Rules Tab](https://docs.google.com/spreadsheets/d/1sVQD6_CsoYtGmguRhc07IDlnz2V4Q2uWTt8Owpl5JE0/edit)
> **Alternative Source**: [Standalone Rules Sheet](https://docs.google.com/spreadsheets/d/1wwH5XUHxQnivm90wGtNLQI_g7P3nPi5ZRcbZ3JU3-YQ/edit)
> **Last Updated**: ${new Date().toISOString().split("T")[0]}
> **Sections**: ${rulesData.length}

---

## Overview

This document contains the comprehensive league rules for the Average at Best Draft League. Rules are parsed from the Google Sheet using AI and stored here for reference and AI contextual awareness.

---

${sections}

---

## Database Storage

Rules are stored in the \`league_config\` table with:
- **config_type**: "rules"
- **section_title**: Section name
- **section_type**: Classification (draft_board_explanation, point_system, battle_format, etc.)
- **content**: Main content text
- **subsections**: JSONB array of subsections
- **embedded_tables**: JSONB array of tables

---

## Notes

- This document is auto-generated from parsed rules stored in database
- Rules may be updated in the Google Sheet - re-run parser to update
- For questions or clarifications, refer to the original sheet
- Rules are stored in database for programmatic access

---

**Generated by**: POKE-MNKY Rules Documentation System
`
}

function generateAIContext(rulesData: any[]): string {
  const summary = rulesData.map((rule) => {
    let summary = `### ${rule.section_title}\n`
    summary += `**Type**: ${rule.section_type || "general_rules"}\n\n`
    if (rule.content) {
      // Truncate long content for AI context
      const content = rule.content.length > 800 
        ? rule.content.substring(0, 800) + "..."
        : rule.content
      summary += `${content}\n\n`
    }
    
    // Add key subsections
    if (rule.subsections && rule.subsections.length > 0) {
      for (const subsection of rule.subsections.slice(0, 3)) {
        if (subsection.subsection_title) {
          summary += `#### ${subsection.subsection_title}\n\n`
        }
        if (subsection.content) {
          const subContent = subsection.content.length > 300
            ? subsection.content.substring(0, 300) + "..."
            : subsection.content
          summary += `${subContent}\n\n`
        }
      }
    }
    
    return summary
  }).join("\n---\n\n")

  return `---
description: League Rules - AI Context for POKE MNKY
globs: 
alwaysApply: true
---

# League Rules - AI Context

This file provides contextual awareness of league rules for AI assistants working on POKE MNKY.

> **Source**: Google Sheet - Rules tab (parsed and stored in \`league_config\` table)
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

- **\`league_config\`**: Stores parsed rules sections
- **\`draft_budgets\`**: Tracks point spending (120 total, spent_points, remaining_points)
- **\`team_rosters\`**: Draft picks with \`draft_points\` field
- **\`teams\`**: Team information with division/conference

---

**Full Documentation**: See \`docs/LEAGUE-RULES.md\` for complete rules.

**Database Query**: \`SELECT * FROM league_config WHERE config_type = 'rules'\`
`
}

storeAndDocumentRules()
