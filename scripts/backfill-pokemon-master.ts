/**
 * CLI wrapper for pokemon_master backfill (same logic as POST /api/admin/pokemon-master/backfill).
 *
 *   pnpm exec tsx --env-file=.env.local scripts/backfill-pokemon-master.ts
 *   pnpm exec tsx --env-file=.env.local scripts/backfill-pokemon-master.ts --dry-run
 */

import { backfillPokemonMasterFromDraftPool } from "../lib/pokemon-master-backfill"

async function main() {
  const dryRun = process.argv.includes("--dry-run")
  const result = await backfillPokemonMasterFromDraftPool({ dry_run: dryRun })
  console.log(JSON.stringify(result, null, 2))
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
