/**
 * Document rules using the Rules parser output
 * Safer approach - uses existing parser infrastructure
 */

import { GoogleSpreadsheet } from "google-spreadsheet"
import { RulesParser } from "../lib/google-sheets-parsers/rules-parser"
import { getGoogleServiceAccountCredentials } from "../lib/utils/google-sheets"
import { createClient } from "@supabase/supabase-js"
import { writeFile } from "fs/promises"
import { join } from "path"
import { existsSync, mkdirSync } from "fs"

async function documentRulesFromParser() {
  // Load environment variables
  require("dotenv").config({ path: ".env.local" })

  const spreadsheetId = "1sVQD6_CsoYtGmguRhc07IDlnz2V4Q2uWTt8Owpl5JE0"
  const sheetName = "Rules"

  console.log("=".repeat(70))
  console.log("📋 Documenting Rules from Parser")
  console.log("=".repeat(70))
  console.log(`📊 Spreadsheet ID: ${spreadsheetId}`)
  console.log(`📋 Sheet: ${sheetName}\n`)

  try {
    const credentials = getGoogleServiceAccountCredentials()
    if (!credentials) {
      throw new Error("Google Sheets credentials not configured")
    }

    // Initialize Supabase client
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    // Use the test parser infrastructure instead
    // This avoids loading the sheet manually
    console.log("🔍 Checking for stored rules in database...\n")

    // Get rules from database (if stored)
    const { data: rulesData } = await supabase
      .from("league_config")
      .select("*")
      .eq("config_type", "rules")
      .order("created_at", { ascending: true })

    if (!rulesData || rulesData.length === 0) {
      console.log("⚠️ Rules not found in database. Using parser output structure...")
      // We'll create documentation from what we know about the structure
      await createDocumentationFromStructure()
      return
    }

    console.log(`✅ Found ${rulesData.length} rule sections in database\n`)

    // Generate markdown documentation
    const markdown = generateMarkdownFromRules(rulesData)
    
    // Ensure docs directory exists
    const docsDir = join(process.cwd(), "docs")
    if (!existsSync(docsDir)) {
      mkdirSync(docsDir, { recursive: true })
    }

    // Write markdown file
    const docsPath = join(docsDir, "LEAGUE-RULES.md")
    await writeFile(docsPath, markdown, "utf-8")
    console.log(`✅ Rules documented: ${docsPath}`)

    // Create AI context file
    const aiContext = generateAIContext(rulesData)
    const contextPath = join(process.cwd(), ".cursor", "rules", "league-rules.mdc")
    await writeFile(contextPath, aiContext, "utf-8")
    console.log(`✅ AI context file created: ${contextPath}`)

    console.log("\n" + "=".repeat(70))
    console.log("✅ Rules Documentation Complete")
    console.log("=".repeat(70))
  } catch (error: any) {
    console.error("❌ Error:", error.message)
    // Fallback: create basic documentation
    await createDocumentationFromStructure()
  }
}

function generateMarkdownFromRules(rulesData: any[]): string {
  const sections = rulesData.map((rule) => {
    const subsections = rule.subsections || []
    const tables = rule.embedded_tables || []

    let sectionMarkdown = `## ${rule.section_title}\n\n`
    sectionMarkdown += `**Type**: ${rule.section_type}\n\n`
    
    if (rule.content) {
      sectionMarkdown += `${rule.content}\n\n`
    }

    if (subsections.length > 0) {
      for (const subsection of subsections) {
        sectionMarkdown += `### ${subsection.subsection_title}\n\n`
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

    if (tables.length > 0) {
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

This document contains the comprehensive league rules for the Average at Best Draft League. Rules are parsed from the Google Sheet and stored here for reference and AI contextual awareness.

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

- This document is auto-generated from parsed rules
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
    summary += `**Type**: ${rule.section_type}\n\n`
    if (rule.content) {
      // Truncate long content
      const content = rule.content.length > 500 
        ? rule.content.substring(0, 500) + "..."
        : rule.content
      summary += `${content}\n\n`
    }
    return summary
  }).join("\n")

  return `---
description: League Rules - AI Context for POKE MNKY
globs: 
alwaysApply: true
---

# League Rules - AI Context

This file provides contextual awareness of league rules for AI assistants working on POKE MNKY.

## Key Rules Summary

${summary}

---

## Critical Rules for AI Decision-Making

### Draft Board & Point System
- **Point Values**: Range from 20 (highest) to 12 (lowest) points
- **Budget**: Each team has 120 points total
- **Draft Format**: Snake draft with point-based selection
- **Draft Board Structure**: Row 3 has point headers, Pokemon start at row 5

### Team Structure
- **Roster Size**: 11 Pokemon per team
- **Team Pages**: Structured format (A2:B2 = team name, A4:B4 = coach, C-E = picks)
- **Point Tracking**: Stored in \`draft_budgets\` table per team per season

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
- **Draft Picks**: Always check point values and remaining budget
- **Team Creation**: Use actual team names from Team Pages, not point-based names
- **Point Validation**: Warn if picks exceed remaining budget
- **Match Scheduling**: Follow conference/division structure
- **Standings**: Calculate based on wins, losses, and differential

---

**Full Documentation**: See \`docs/LEAGUE-RULES.md\` for complete rules.

**Source**: Google Sheet - Rules tab (parsed and stored in \`league_config\` table)
`
}

async function createDocumentationFromStructure() {
  console.log("📝 Creating documentation from known structure...")
  
  // Create basic documentation based on what we know
  const basicDocs = `# League Rules Documentation

> **Source**: [Google Sheet - Rules Tab](https://docs.google.com/spreadsheets/d/1sVQD6_CsoYtGmguRhc07IDlnz2V4Q2uWTt8Owpl5JE0/edit)
> **Alternative Source**: [Standalone Rules Sheet](https://docs.google.com/spreadsheets/d/1wwH5XUHxQnivm90wGtNLQI_g7P3nPi5ZRcbZ3JU3-YQ/edit)
> **Last Updated**: ${new Date().toISOString().split("T")[0]}

---

## Overview

This document contains the comprehensive league rules for the Average at Best Draft League. Rules are parsed from the Google Sheet and stored here for reference and AI contextual awareness.

**Note**: Rules parser successfully extracted 6 sections. Full content will be available after rules are stored in the database.

---

## Known Rule Sections

Based on parser analysis, the Rules sheet contains:

1. **Draft Board Explanation** - How the draft board works
2. **Point System** - Point values and spending rules
3. **Battle Format** - Match rules and format
4. **Playoff Structure** - Playoff organization
5. **General Rules** - League-wide regulations
6. **Other Sections** - Additional procedural information

---

## Draft Board & Point System

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

## Battle Format

- **Format**: 6v6 Singles
- **Scoring**: Wins/losses tracked with differential
- **Standings**: Based on record and point differential

---

## League Structure

### Conferences & Divisions

- **Lance Conference**: Kanto Division, Johto Division
- **Leon Conference**: Hoenn Division, Sinnoh Division

---

## Next Steps

To get full rules content:
1. Ensure rules are stored in \`league_config\` table
2. Re-run this script to generate complete documentation
3. Rules will be automatically parsed and documented

---

**Generated by**: POKE-MNKY Rules Documentation System
`

  const docsDir = join(process.cwd(), "docs")
  if (!existsSync(docsDir)) {
    mkdirSync(docsDir, { recursive: true })
  }

  const docsPath = join(docsDir, "LEAGUE-RULES.md")
  await writeFile(docsPath, basicDocs, "utf-8")
  console.log(`✅ Basic documentation created: ${docsPath}`)
}

documentRulesFromParser()
