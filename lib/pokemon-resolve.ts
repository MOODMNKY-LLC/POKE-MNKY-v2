import type { SupabaseClient } from "@supabase/supabase-js"
import { getPokemonDataExtended } from "@/lib/pokemon-api-enhanced"

function slugifyPokemonName(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .replace(/['']/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
}

function normalizePokemonType(value: string | null | undefined): string | null {
  if (!value) return null
  return value.trim().toLowerCase()
}

function parseTypes(types: unknown): [string | null, string | null] {
  let raw1: string | null = null
  let raw2: string | null = null
  if (Array.isArray(types)) {
    raw1 = types[0] ? String(types[0]) : null
    raw2 = types[1] ? String(types[1]) : null
  } else if (typeof types === "string") {
    try {
      const parsed = JSON.parse(types) as string[]
      raw1 = parsed[0] ?? null
      raw2 = parsed[1] ?? null
    } catch {
      const parts = types.split(",").map((s) => s.trim())
      raw1 = parts[0] ?? null
      raw2 = parts[1] ?? null
    }
  }
  return [normalizePokemonType(raw1), normalizePokemonType(raw2)]
}

/** Resolve a display name to `public.pokemon.id` (creates row if needed). */
export async function resolveOrCreatePokemonId(
  supabase: SupabaseClient,
  rawName: string
): Promise<{ id: string; name: string; type1: string | null; type2: string | null } | null> {
  const displayName = rawName.trim()
  if (!displayName) return null

  const slug = slugifyPokemonName(displayName)

  const { data: bySlug } = await supabase
    .from("pokemon")
    .select("id, name, type1, type2")
    .eq("slug", slug)
    .maybeSingle()

  if (bySlug) {
    return {
      id: bySlug.id,
      name: bySlug.name,
      type1: bySlug.type1,
      type2: bySlug.type2,
    }
  }

  const { data: byName } = await supabase
    .from("pokemon")
    .select("id, name, type1, type2")
    .or(`name.ilike.${displayName},species_name.ilike.${displayName}`)
    .limit(1)
    .maybeSingle()

  if (byName) {
    return {
      id: byName.id,
      name: byName.name,
      type1: byName.type1,
      type2: byName.type2,
    }
  }

  let type1: string | null = null
  let type2: string | null = null

  const { data: cached } = await supabase
    .from("pokemon_cache")
    .select("name, types")
    .ilike("name", `%${displayName}%`)
    .limit(1)
    .maybeSingle()

  if (cached) {
    ;[type1, type2] = parseTypes(cached.types)
  } else {
    const extended = await getPokemonDataExtended(displayName, false)
    if (extended?.types) {
      ;[type1, type2] = parseTypes(extended.types)
    }
  }

  const safeType1 = type1 ?? "normal"
  const safeType2 = type2 ?? null

  const { data: created, error } = await supabase
    .from("pokemon")
    .upsert(
      {
        name: displayName,
        species_name: displayName,
        slug,
        type1: safeType1,
        type2: safeType2,
        eligible: true,
      },
      { onConflict: "slug" }
    )
    .select("id, name, type1, type2")
    .single()

  if (error || !created) {
    console.warn(`[pokemon-resolve] Failed to create pokemon "${displayName}":`, error?.message)
    return null
  }

  return {
    id: created.id,
    name: created.name,
    type1: created.type1,
    type2: created.type2,
  }
}
