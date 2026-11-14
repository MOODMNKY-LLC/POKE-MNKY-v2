#!/usr/bin/env tsx
/**
 * One-time / ops importer: Pokédex L:P → draft_pool_versions pending revision.
 *
 * Dry-run by default (no DB writes). Pass --apply to write a pending revision
 * for --season-id. Never run --apply against production from CI.
 *
 * Examples:
 *   pnpm exec tsx scripts/draft-pool/import-pending.ts --fixture
 *   pnpm exec tsx scripts/draft-pool/import-pending.ts --csv scripts/draft-pool/fixtures/pokedex_L_P.csv
 *   pnpm exec tsx scripts/draft-pool/import-pending.ts --from-sheet --season-id <uuid> --apply
 */

import { readFileSync, existsSync } from "node:fs"
import { join, resolve } from "node:path"
import { createClient } from "@supabase/supabase-js"
import { JWT } from "google-auth-library"
import { google } from "googleapis"
import {
  applyMattOverrides,
  applyPendingRevision,
  buildImportPlan,
  formatDryRunSummary,
  parseAliasMapJson,
  parseMattOverridesJson,
  parsePokedexCsv,
  parsePokedexGridLp,
  parsePokemonMasterCsv,
  parseTeraList,
} from "@/lib/draft-pool-builder"
import { DEFAULT_TERA_BAN_NAMES } from "@/lib/draft-pool-builder/restrictions"
import { getGoogleServiceAccountCredentials } from "@/lib/utils/google-sheets"

const FIXTURE_DIR = join(process.cwd(), "scripts/draft-pool/fixtures")

function argValue(argv: string[], name: string): string | undefined {
  const i = argv.indexOf(name)
  if (i < 0) return undefined
  return argv[i + 1]
}

function hasFlag(argv: string[], name: string): boolean {
  return argv.includes(name)
}

function loadFixtureText(name: string): string {
  const path = join(FIXTURE_DIR, name)
  if (!existsSync(path)) {
    throw new Error(`Missing fixture: ${path}`)
  }
  return readFileSync(path, "utf8")
}

async function loadFromGoogleSheet(): Promise<string[][]> {
  const credentials = getGoogleServiceAccountCredentials()
  const sheetId = process.env.GOOGLE_SHEET_ID?.trim()
  if (!credentials || !sheetId) {
    throw new Error(
      "Live sheet read needs GOOGLE_SERVICE_ACCOUNT_EMAIL, GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY (or GOOGLE_PRIVATE_KEY), and GOOGLE_SHEET_ID",
    )
  }
  const auth = new JWT({
    email: credentials.email,
    key: credentials.privateKey,
    scopes: ["https://www.googleapis.com/auth/spreadsheets.readonly"],
  })
  const sheets = google.sheets({ version: "v4", auth })
  // Pokédex L:P — same tab the league sync already pulls ('Pokédex'!A1:P1264)
  const response = await sheets.spreadsheets.values.get({
    spreadsheetId: sheetId,
    range: "'Pokédex'!L:P",
    valueRenderOption: "FORMATTED_VALUE",
  })
  return (response.data.values ?? []).map((row) =>
    row.map((cell) => (cell == null ? "" : String(cell))),
  )
}

async function main(): Promise<void> {
  const argv = process.argv.slice(2)
  const useFixture = hasFlag(argv, "--fixture") || (!hasFlag(argv, "--csv") && !hasFlag(argv, "--from-sheet"))
  const apply = hasFlag(argv, "--apply")
  const seasonId = argValue(argv, "--season-id")
  const csvPath = argValue(argv, "--csv")
  const fromSheet = hasFlag(argv, "--from-sheet")
  const actorUserId = argValue(argv, "--actor-user-id") ?? null

  if (apply && !seasonId) {
    console.error("--apply requires --season-id <uuid>")
    process.exit(1)
  }

  const overrides = parseMattOverridesJson(loadFixtureText("matt_overrides.json"))
  const aliasEntries = parseAliasMapJson(loadFixtureText("alias_map.json"))
  const catalogRows = parsePokemonMasterCsv(loadFixtureText("pokemon_master.csv"))

  let teraNames = parseTeraList(loadFixtureText("tera_list.txt"))
  if (teraNames.length === 0) {
    teraNames = [...DEFAULT_TERA_BAN_NAMES]
  }

  let sheetRows
  let sourceLabel: string

  if (fromSheet) {
    const grid = await loadFromGoogleSheet()
    sheetRows = applyMattOverrides(parsePokedexGridLp(grid), overrides)
    sourceLabel = "Google Sheets Pokédex!L:P"
  } else if (csvPath) {
    const text = readFileSync(resolve(csvPath), "utf8")
    sheetRows = applyMattOverrides(parsePokedexCsv(text), overrides)
    sourceLabel = resolve(csvPath)
  } else if (useFixture) {
    sheetRows = applyMattOverrides(
      parsePokedexCsv(loadFixtureText("pokedex_L_P.csv")),
      overrides,
    )
    sourceLabel = "scripts/draft-pool/fixtures/pokedex_L_P.csv"
  } else {
    console.error("Provide --fixture, --csv <path>, or --from-sheet")
    process.exit(1)
  }

  const plan = buildImportPlan({
    sheetRows,
    teraNames,
    aliasEntries,
    catalogRows,
  })

  console.log(`Source: ${sourceLabel}`)
  console.log(formatDryRunSummary(plan))
  console.log("")
  console.log(
    apply
      ? `Mode: APPLY → pending revision for season ${seasonId}`
      : "Mode: dry-run (pass --apply --season-id <uuid> to write; do not use against production)",
  )

  if (!apply) {
    process.exit(0)
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL
  const key =
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY
  if (!url || !key) {
    console.error(
      "Apply needs NEXT_PUBLIC_SUPABASE_URL (or SUPABASE_URL) and SUPABASE_SERVICE_ROLE_KEY",
    )
    process.exit(1)
  }

  // Guardrail: refuse obvious production project ref unless explicitly overridden
  const allowProd = hasFlag(argv, "--i-understand-production-risk")
  if (url.includes("chmrszrwlfeqovwxyrmt") && !allowProd) {
    console.error(
      "Refusing --apply against production project chmrszrwlfeqovwxyrmt. Re-run with --i-understand-production-risk only if intentional.",
    )
    process.exit(1)
  }

  const supabase = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  })

  const result = await applyPendingRevision({
    supabase,
    seasonId: seasonId!,
    plan,
    actorUserId,
    notes: `Imported from ${sourceLabel} (${new Date().toISOString()})`,
  })

  console.log("")
  console.log("Applied pending revision:")
  console.log(`  version_id:             ${result.versionId}`)
  console.log(`  entries:                ${result.entriesInserted}`)
  console.log(`  restrictions:           ${result.restrictionsInserted}`)
  console.log(`  aliases upserted:       ${result.aliasesUpserted}`)
  console.log(`  catalog-only skipped:   ${result.catalogOnlySkipped}`)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
