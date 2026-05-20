/**
 * Backfill pokemon_master from existing draft_pool + pokemon_unified / showdown types.
 * Required before admin "Generate" can populate season_draft_pool.
 *
 *   pnpm exec tsx --env-file=.env.local scripts/backfill-pokemon-master.ts
 *   pnpm exec tsx --env-file=.env.local scripts/backfill-pokemon-master.ts --dry-run
 */

import { createServiceRoleClient } from "../lib/supabase/service"

const GEN9_PARADOX_NAMES = new Set(
  [
    "Great Tusk",
    "Scream Tail",
    "Brute Bonnet",
    "Flutter Mane",
    "Slither Wing",
    "Sandy Shocks",
    "Iron Treads",
    "Iron Bundle",
    "Iron Hands",
    "Iron Jugulis",
    "Iron Moth",
    "Iron Thorns",
    "Roaring Moon",
    "Iron Valiant",
    "Walking Wake",
    "Iron Leaves",
    "Gouging Fire",
    "Raging Bolt",
    "Iron Boulder",
    "Iron Crown",
  ].map((n) => n.toLowerCase())
)

const GEN9_BOX_LEGENDARIES = new Set(
  ["Koraidon", "Miraidon", "Wo-Chien", "Chien-Pao", "Ting-Lu", "Chi-Yu", "Ogerpon", "Terapagos"].map(
    (n) => n.toLowerCase()
  )
)

function slugify(name: string, generation: number): string {
  const base = name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
  return `${base}-g${generation}`
}

function showdownId(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "")
    .replace(/[^a-z0-9-]/g, "")
}

async function main() {
  const dryRun = process.argv.includes("--dry-run")
  const supabase = createServiceRoleClient()

  const { count: existing } = await supabase.from("pokemon_master").select("id", { count: "exact", head: true })
  console.log(`pokemon_master rows before: ${existing ?? 0}`)

  const { data: poolRows, error: poolErr } = await supabase
    .from("draft_pool")
    .select("pokemon_name, generation, point_value")
    .not("generation", "is", null)

  if (poolErr) {
    console.error("draft_pool fetch failed:", poolErr.message)
    process.exit(1)
  }

  const byKey = new Map<string, { name: string; generation: number; points: number | null }>()
  for (const row of poolRows ?? []) {
    const gen = row.generation as number
    const name = (row.pokemon_name as string)?.trim()
    if (!name || !gen) continue
    const key = `${name.toLowerCase()}|${gen}`
    const prev = byKey.get(key)
    const pts = row.point_value as number | null
    if (!prev || (pts != null && (prev.points == null || pts > prev.points))) {
      byKey.set(key, { name, generation: gen, points: pts })
    }
  }

  console.log(`Distinct name+generation entries from draft_pool: ${byKey.size}`)

  const { data: unified } = await supabase
    .from("pokemon_unified")
    .select("name, dex_num, type_primary, type_secondary")

  const unifiedByName = new Map<string, { dex: number; t1: string | null; t2: string | null }>()
  for (const u of unified ?? []) {
    const key = (u.name as string)?.toLowerCase().trim()
    if (!key) continue
    unifiedByName.set(key, {
      dex: Number(u.dex_num) || 0,
      t1: (u.type_primary as string | null) ?? null,
      t2: (u.type_secondary as string | null) ?? null,
    })
  }

  const { data: types } = await supabase.from("pokemon_showdown_types").select("showdown_id, slot, type")

  const typesByShowdown = new Map<string, { t1?: string; t2?: string }>()
  for (const t of types ?? []) {
    const sid = t.showdown_id as string
    const slot = Number(t.slot)
    const typeName = (t.type as string)?.toLowerCase()
    if (!sid || !typeName) continue
    const entry = typesByShowdown.get(sid) ?? {}
    if (slot === 1) entry.t1 = typeName
    if (slot === 2) entry.t2 = typeName
    typesByShowdown.set(sid, entry)
  }

  const { data: showdown } = await supabase.from("pokemon_showdown").select("showdown_id, tier, dex_num")

  const tierByShowdown = new Map<string, string>()
  const dexByShowdown = new Map<string, number>()
  for (const s of showdown ?? []) {
    const sid = s.showdown_id as string
    if (sid) {
      tierByShowdown.set(sid, (s.tier as string) ?? "")
      if (s.dex_num != null) dexByShowdown.set(sid, Number(s.dex_num))
    }
  }

  const records: Array<Record<string, unknown>> = []
  for (const { name, generation, points } of byKey.values()) {
    const nameKey = name.toLowerCase()
    const sid = showdownId(name)
    const uni = unifiedByName.get(nameKey)
    const st = typesByShowdown.get(sid)
    const tier = tierByShowdown.get(sid) ?? ""
    const nationalDex = uni?.dex || dexByShowdown.get(sid) || 0
    const primaryType = (uni?.t1 || st?.t1 || "normal").toLowerCase()
    const secondaryType = uni?.t2 || st?.t2 || null
    const isParadox = GEN9_PARADOX_NAMES.has(nameKey) && generation === 9
    const isLegendary =
      GEN9_BOX_LEGENDARIES.has(nameKey) ||
      (tier === "Uber" && generation === 9 && !isParadox && !nameKey.includes("ogerpon"))
    const isMythical = ["Pecharunt", "Meltan", "Melmetal"].map((n) => n.toLowerCase()).includes(nameKey)

    if (nationalDex <= 0) {
      console.warn(`  skip (no dex): ${name} gen ${generation}`)
      continue
    }

    records.push({
      national_dex: nationalDex,
      name,
      slug: slugify(name, generation),
      generation,
      primary_type: primaryType,
      secondary_type: secondaryType,
      default_draft_points: points,
      is_legendary: isLegendary,
      is_mythical: isMythical,
      is_paradox: isParadox,
    })
  }

  console.log(`Ready to upsert ${records.length} pokemon_master rows${dryRun ? " (dry-run)" : ""}`)
  const gen9 = records.filter((r) => r.generation === 9).length
  console.log(`  Gen 9: ${gen9}`)

  if (dryRun) return

  const BATCH = 100
  let upserted = 0
  for (let i = 0; i < records.length; i += BATCH) {
    const batch = records.slice(i, i + BATCH)
    const { error } = await supabase.from("pokemon_master").upsert(batch, { onConflict: "slug" })
    if (error) {
      console.error("upsert failed:", error.message)
      process.exit(1)
    }
    upserted += batch.length
  }

  const { count: after } = await supabase.from("pokemon_master").select("id", { count: "exact", head: true })
  console.log(`Done. Upserted batches total ${upserted}; pokemon_master rows now: ${after ?? "?"}`)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
