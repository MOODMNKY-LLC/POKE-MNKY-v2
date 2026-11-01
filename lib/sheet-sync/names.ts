/** Aliases observed on the Season 7 sheet. Port of names.py. */
export const POKEMON_ALIASES: Record<string, string> = {
  "slowking galar": "Slowking Galarian",
  colbalion: "Cobalion",
  alcreamie: "Alcremie",
  "alolan ninetales": "Ninetales Alolan",
  "goodra-hisuian": "Goodra Hisuian",
  primirina: "Primarina",
  "rotom wash": "Rotom Wash",
  thundrous: "Thundurus Incarnate",
  venuasaur: "Venusaur",
}

export type DexEntry = { name: string; pts: number | null }

export function canon(raw: string | null | undefined, dex?: Map<string, DexEntry>): string | null {
  const collapsed = (raw ?? "").split(/\s+/).filter(Boolean).join(" ")
  if (!collapsed) return null
  const alias = POKEMON_ALIASES[collapsed.toLowerCase()]
  if (alias) return alias
  const known = dex?.get(collapsed.toLowerCase())
  if (known) return known.name
  return collapsed
}

export function slugify(name: string): string {
  return name
    .toLowerCase()
    .replaceAll("é", "e")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
}
