/**
 * Inspect the "Data" sheet header layout and key sections.
 *
 * Usage:
 *   pnpm tsx scripts/inspect-data-sheet.ts [spreadsheet_id]
 *
 * Notes:
 * - Uses the same service-account credential loader as the app.
 * - Outputs a column map to `temp/data-sheet-column-map.json`.
 */
import * as dotenv from "dotenv"
import * as path from "path"
import * as fs from "fs"
import { JWT } from "google-auth-library"
import { google } from "googleapis"
import { getGoogleServiceAccountCredentials } from "../lib/utils/google-sheets"

dotenv.config({ path: path.join(process.cwd(), ".env.local") })

const SPREADSHEET_ID =
  process.argv[2] || process.env.GOOGLE_SHEET_ID || "1sVQD6_CsoYtGmguRhc07IDlnz2V4Q2uWTt8Owpl5JE0"

function getColumnLetter(columnNumber: number): string {
  let result = ""
  let n = columnNumber
  while (n > 0) {
    n--
    result = String.fromCharCode(65 + (n % 26)) + result
    n = Math.floor(n / 26)
  }
  return result || "A"
}

type ColumnInfo = {
  index1: number
  letter: string
  headerRow1?: string
  headerRow2?: string
  headerRow3?: string
}

async function main() {
  const credentials = getGoogleServiceAccountCredentials()
  if (!credentials) {
    throw new Error("Google Sheets credentials not configured (missing GOOGLE_SERVICE_ACCOUNT_EMAIL / key)")
  }

  const auth = new JWT({
    email: credentials.email,
    key: credentials.privateKey,
    scopes: [
      "https://www.googleapis.com/auth/spreadsheets.readonly",
      "https://www.googleapis.com/auth/drive.readonly",
    ],
  })

  const sheets = google.sheets({ version: "v4", auth })

  // Grab the first 3 rows across a wide range to capture multi-row headers.
  const range = "Data!A1:ZZ3"
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range,
    valueRenderOption: "FORMATTED_VALUE",
  })

  const rows = (res.data.values || []) as string[][]
  const row1 = rows[0] || []
  const row2 = rows[1] || []
  const row3 = rows[2] || []

  const maxLen = Math.max(row1.length, row2.length, row3.length)

  const columns: ColumnInfo[] = []
  for (let i = 0; i < maxLen; i++) {
    const v1 = row1[i] ? String(row1[i]).trim() : ""
    const v2 = row2[i] ? String(row2[i]).trim() : ""
    const v3 = row3[i] ? String(row3[i]).trim() : ""
    columns.push({
      index1: i + 1,
      letter: getColumnLetter(i + 1),
      headerRow1: v1 || undefined,
      headerRow2: v2 || undefined,
      headerRow3: v3 || undefined,
    })
  }

  // Heuristic section markers: where a header row introduces a new block label.
  const sectionMarkers = columns
    .filter((c) => c.headerRow1 && c.headerRow1.length >= 3)
    .map((c) => ({ column: c.letter, index1: c.index1, label: c.headerRow1 }))

  const output = {
    spreadsheetId: SPREADSHEET_ID,
    inspectedRange: range,
    columnCountDetected: maxLen,
    sectionMarkers,
    columns,
  }

  const outPath = path.join(process.cwd(), "temp", "data-sheet-column-map.json")
  fs.mkdirSync(path.dirname(outPath), { recursive: true })
  fs.writeFileSync(outPath, JSON.stringify(output, null, 2), "utf8")

  console.log(`✅ Wrote Data sheet column map: ${outPath}`)
  console.log(`📌 Columns detected: ${maxLen}`)
  console.log("📌 Section markers (header row 1):")
  for (const s of sectionMarkers) {
    console.log(`   - ${s.column} (${s.index1}): ${s.label}`)
  }

  // Also sample the "Season Stats per Team for Pokemon" block, which begins at CB.
  // This block is often a separate table on the right side of the sheet.
  const pokemonStatsRange = "Data!CB1:CH60"
  const pokemonStatsRes = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: pokemonStatsRange,
    valueRenderOption: "FORMATTED_VALUE",
  })

  const pokemonStatsSample = {
    spreadsheetId: SPREADSHEET_ID,
    inspectedRange: pokemonStatsRange,
    values: pokemonStatsRes.data.values || [],
  }

  const pokemonOutPath = path.join(process.cwd(), "temp", "data-sheet-pokemon-stats-sample.json")
  fs.writeFileSync(pokemonOutPath, JSON.stringify(pokemonStatsSample, null, 2), "utf8")
  console.log(`✅ Wrote Pokemon stats sample: ${pokemonOutPath}`)
}

main().catch((err) => {
  console.error("❌ Failed to inspect Data sheet:", err)
  process.exit(1)
})

