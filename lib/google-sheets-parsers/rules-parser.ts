/**
 * Rules Parser
 * Handles parsing of rules sheets with hierarchical text structure
 * Extracts sections, subsections, and structured content
 */

import { BaseParser, ParserConfig, ParserResult } from "./base-parser"
import { z } from "zod"
import { zodResponseFormat } from "openai/helpers/zod"
import { openai, AI_MODELS } from "../openai-client"

// Schema for hierarchical rules document
const RuleSectionSchema = z.object({
  section_title: z.string(),
  section_type: z.enum(["draft_board_explanation", "point_system", "battle_format", "playoff_structure", "general_rules", "other"]),
  content: z.string(),
  subsections: z.array(z.object({
    subsection_title: z.string(),
    content: z.string(),
    rules: z.array(z.string()).optional(),
  })).optional(),
  embedded_tables: z.array(z.object({
    table_title: z.string().optional(),
    headers: z.array(z.string()),
    rows: z.array(z.array(z.string())),
  })).optional(),
})

const RulesDocumentSchema = z.object({
  sections: z.array(RuleSectionSchema),
  errors: z.array(z.string()).optional(),
})

export class RulesParser extends BaseParser {
  async parse(): Promise<ParserResult> {
    this.log(`Parsing rules from sheet "${this.sheet.title}"`)

    try {
      // Extract hierarchical structure using AI
      const structure = await this.extractStructure()

      if (structure.sections.length === 0) {
        this.warn("No sections detected in rules sheet")
        return this.getResult()
      }

      this.log(`Detected ${structure.sections.length} section(s)`)

      // Store rules in database
      await this.storeRules(structure.sections)

      return this.getResult()
    } catch (error) {
      this.error("Failed to parse rules", error)
      return this.getResult()
    }
  }

  /**
   * Extract hierarchical structure from rules sheet
   */
  private async extractStructure(): Promise<z.infer<typeof RulesDocumentSchema>> {
    // Try to get data using getRows() first (more reliable, doesn't require Drive scope)
    const maxRows = Math.min(this.sheet.rowCount, 200)
    const maxCols = Math.min(this.sheet.columnCount, 20)
    
    // Extract cell data - prefer getRows() over loadCells()
    const cellData: Array<{
      row: number
      column: number
      value: any
      formattedValue: string
      isBold: boolean
      isEmpty: boolean
    }> = []

    try {
      // Try getRows() first - more reliable and doesn't require Drive scope
      const rows = await this.sheet.getRows({ limit: maxRows })
      for (let rowIdx = 0; rowIdx < rows.length; rowIdx++) {
        const row = rows[rowIdx]
        const rowData = row._rawData || []
        for (let col = 0; col < Math.min(rowData.length, maxCols); col++) {
          const value = rowData[col]
          const isEmpty = value === null || value === undefined || value === ""
          if (!isEmpty || rowIdx < 10) {
            cellData.push({
              row: rowIdx,
              column: col,
              value,
              formattedValue: String(value || ""),
              isBold: false, // Formatting not available via getRows()
              isEmpty,
            })
          }
        }
      }
    } catch (rowsError: any) {
      // Fallback to loadCells() if getRows() fails
      this.warn("getRows() failed, trying loadCells()")
      const range = `A1:${this.getColumnLetter(maxCols)}${maxRows}`
      
      try {
        await this.sheet.loadCells(range)
        
        // Extract from loaded cells
        for (let row = 0; row < maxRows; row++) {
          for (let col = 0; col < maxCols; col++) {
            try {
              const cell = this.sheet.getCell(row, col)
              const isEmpty = cell.value === null || cell.value === undefined || cell.value === ""
              if (!isEmpty || row < 10) {
                cellData.push({
                  row,
                  column: col,
                  value: cell.value,
                  formattedValue: cell.formattedValue || String(cell.value || ""),
                  isBold: cell.textFormat?.bold || false,
                  isEmpty,
                })
              }
            } catch (cellError) {
              // Cell not loaded, skip it
              continue
            }
          }
        }
      } catch (cellsError: any) {
        // If loadCells also fails, try smaller chunks
        if (cellsError.message?.includes("insufficient_scope") || cellsError.message?.includes("403")) {
          this.warn("Large range loadCells failed, trying smaller chunks")
          const chunkSize = 20
          for (let startRow = 0; startRow < maxRows; startRow += chunkSize) {
            const endRow = Math.min(startRow + chunkSize, maxRows)
            const chunkRange = `A${startRow + 1}:${this.getColumnLetter(maxCols)}${endRow}`
            try {
              await this.sheet.loadCells(chunkRange)
              // Extract from this chunk
              for (let row = startRow; row < endRow; row++) {
                for (let col = 0; col < maxCols; col++) {
                  try {
                    const cell = this.sheet.getCell(row, col)
                    const isEmpty = cell.value === null || cell.value === undefined || cell.value === ""
                    if (!isEmpty || row < 10) {
                      cellData.push({
                        row,
                        column: col,
                        value: cell.value,
                        formattedValue: cell.formattedValue || String(cell.value || ""),
                        isBold: false,
                        isEmpty,
                      })
                    }
                  } catch {
                    continue
                  }
                }
              }
            } catch (chunkError) {
              this.warn(`Failed to load chunk ${startRow}-${endRow}, continuing...`)
            }
          }
        } else {
          this.error("Failed to load cell data", cellsError)
          // Return empty structure if we can't load data
          return { sections: [], errors: ["Could not load sheet data"] }
        }
      }
    }

    const prompt = `Extract all sections from this rules document. The document contains league rules, draft board explanations, point system breakdowns, and other procedural information.

Key sections to identify:
1. **Draft Board Explanation**: How the draft board works, pick order, snake draft rules
2. **Point System Breakdown**: Detailed scoring rules, point values, multipliers
3. **Battle Format**: Team composition rules, substitution rules
4. **Playoff Structure**: Seeding rules, bracket format, championship rules
5. **General Rules**: Other league rules and regulations

For each section:
- Extract the section title
- Extract all content (text, paragraphs, lists)
- Identify subsections
- Extract any embedded tables (e.g., point value tables)
- Classify the section type

Sheet data (showing first 100 rows for analysis):
${JSON.stringify(cellData.slice(0, 100), null, 2)}

Return structured sections with hierarchical content.`

    try {
      const responseFormat = zodResponseFormat(RulesDocumentSchema, "rules_document")
      
      // Add timeout to prevent infinite hangs (60 seconds for complex parsing)
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error("AI structure extraction timed out after 60 seconds")), 60000)
      )
      
      const apiPromise = openai.chat.completions.create({
        model: AI_MODELS.STRATEGY_COACH,
        messages: [
          {
            role: "system",
            content:
              "You are an expert at parsing structured documents. Extract hierarchical sections from text-heavy spreadsheets, preserving meaning and structure. Identify key sections like draft board explanations and point system breakdowns.",
          },
          {
            role: "user",
            content: prompt,
          },
        ],
        response_format: responseFormat,
        temperature: 0.3,
      })
      
      const response = await Promise.race([apiPromise, timeoutPromise]) as Awaited<typeof apiPromise>

      const message = response.choices[0].message
      const content = message.content

      if (!content) {
        throw new Error("No response from AI rules extraction")
      }

      const jsonData = JSON.parse(content)
      return RulesDocumentSchema.parse(jsonData)
    } catch (error) {
      this.error("AI structure extraction failed", error)
      return { sections: [], errors: [`AI extraction failed: ${error instanceof Error ? error.message : "Unknown error"}`] }
    }
  }

  /**
   * Store rules in database
   */
  private async storeRules(sections: z.infer<typeof RuleSectionSchema>[]): Promise<void> {
    // Option 1: Store as JSONB in a single field
    // Option 2: Store in structured rules table
    // For now, we'll use a hybrid approach - store structured data in JSONB

    try {
      // Check if rules table exists, if not we'll store in a config table
      const rulesData = {
        sections: sections.map((section) => ({
          title: section.section_title,
          type: section.section_type,
          content: section.content,
          subsections: section.subsections || [],
          embeddedTables: section.embedded_tables || [],
        })),
        extractedAt: new Date().toISOString(),
        sheetName: this.sheet.title,
      }

      // Store rules in league_config table
      // Use service role client to bypass RLS if needed
      for (const section of sections) {
        try {
          const { error } = await this.supabase
            .from("league_config")
            .upsert(
              {
                config_type: "rules",
                section_title: section.section_title,
                section_type: section.section_type || "general_rules",
                content: section.content || "",
                subsections: section.subsections || [],
                embedded_tables: section.embedded_tables || [],
                sheet_name: this.sheet.title,
              },
              {
                onConflict: "config_type,section_title",
              }
            )

          if (error) {
            // If table doesn't exist, log but don't fail completely
            if (error.code === "PGRST205" || error.message?.includes("Could not find the table")) {
              this.warn(`league_config table not found in schema cache. Migration may need to be applied. Section: "${section.section_title}"`)
            } else {
              this.error(`Failed to store rule section "${section.section_title}"`, error)
            }
          } else {
            this.recordsProcessed++
          }
        } catch (err: any) {
          this.warn(`Error storing section "${section.section_title}": ${err.message}`)
        }
      }

      if (this.recordsProcessed > 0) {
        this.log(`Successfully stored ${this.recordsProcessed} rule sections in league_config table`)
      } else {
        this.warn(`No sections stored. Check if league_config table exists and migration is applied.`)
      }
    } catch (error) {
      this.error("Error storing rules", error)
    }
  }
}
