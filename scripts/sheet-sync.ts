import { readFileSync } from "node:fs"
import { join } from "node:path"
import { planSheetSync } from "@/lib/sheet-sync/execute"
import { loadSnapshotDir } from "@/lib/sheet-sync/parse"
import type { NormalizedLeague } from "@/lib/sheet-sync/types"

const dryRun = process.argv.includes("--dry-run") || !process.argv.includes("--apply")
const fixtureDir = join(process.cwd(), "fixtures/league-sheet/s7-2026-11-01")
const current = JSON.parse(
  readFileSync(join(process.cwd(), "fixtures/league-sheet/s7-production-public.json"), "utf8"),
) as NormalizedLeague
const plan = planSheetSync(loadSnapshotDir(fixtureDir), current)

console.log(`# League sheet sync (${dryRun ? "dry run" : "plan only"})`)
console.log("")
console.log(`Status: ${plan.status}`)
if (plan.reason) console.log(`Reason: ${plan.reason}`)
console.log("")
console.log("| Change | Count |")
console.log("| --- | --- |")
for (const [key, count] of Object.entries(plan.counts)) console.log(`| ${key} | ${count} |`)
if (Object.keys(plan.counts).length === 0) console.log("| none | 0 |")
console.log("")
console.log("This CLI compares the committed sheet snapshot with the public Season 7 snapshot.")
console.log("A live apply runs from the 06:15 UTC cron or Admin → League sheet sync.")
