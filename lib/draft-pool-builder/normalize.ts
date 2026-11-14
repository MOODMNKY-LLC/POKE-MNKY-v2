/** Name/slug normalization shared by aliases and classification. */

const ORICORIO_STYLE_SLUGS = new Set([
  "oricorio-pom-pom",
  "oricorio-pau",
  "oricorio-sensu",
])

const PIKACHU_CAP_SLUGS = new Set([
  "pikachu-alola-cap",
  "pikachu-hoenn",
  "pikachu-kalos",
  "pikachu-original",
  "pikachu-partner",
  "pikachu-sinnoh",
  "pikachu-unova",
  "pikachu-world",
  "pikachu-alola",
])

/** Known CAP / fakemon names seen on Season 7 (exclude from Season 8 pool). */
export const FAKEMON_NAMES = new Set([
  "Ababo",
  "Argalis",
  "Brattler",
  "Breezi",
  "Caimanoe",
  "Cawdet",
  "Chuggon",
  "Coribalis",
  "Cupra",
  "Dorsoil",
  "Draggalong",
  "Duohm",
  "Electrelk",
  "Embirch",
  "Fawnifer",
  "Flarelm",
  "Floatoy",
  "Flox",
  "Justyke",
  "Miasmite",
  "Monohm",
  "Mumbao",
  "Necturine",
  "Nohface",
  "Pluffle",
  "Privatyke",
  "Protowatt",
  "Rebble",
  "Saharascal",
  "Scattervein",
  "Scratchet",
  "Smogecko",
  "Smoguana",
  "Snugglow",
  "Solotl",
  "Swirlpool",
  "Syclar",
  "Tactite",
  "Volkritter",
  "Voodoll",
])

/**
 * Extra match tokens keyed by normalized sheet slug.
 * Display names in outputs always come from the sheet (or Matt override).
 */
export const MANUAL_ALIASES: Record<string, string[]> = {
  toxtricity: ["toxtricity-amped"],
  urshifu: ["urshifu-single-strike", "urshifu-single"],
  basculegion: ["basculegion-male", "basculegion-m"],
  "basculegion-f": ["basculegion-female"],
  oinkologne: ["oinkologne-male", "oinkologne-m"],
  "oinkologne-f": ["oinkologne-female"],
  indeedee: ["indeedee-male", "indeedee-m"],
  "indeedee-f": ["indeedee-female"],
  meowstic: ["meowstic-male", "meowstic-m"],
  "meowstic-f": ["meowstic-female"],
  lycanroc: ["lycanroc-midday"],
  ogerpon: ["ogerpon-teal"],
  deoxys: ["deoxys-normal"],
  "tauros-paldea": [
    "tauros-paldea-combat",
    "tauros-paldean",
    "tauros-paldean-combat",
  ],
  "tauros-paldea-fire": [
    "tauros-paldea-blaze",
    "tauros-paldean-blaze",
    "tauros-paldean-fire",
  ],
  "tauros-paldea-water": [
    "tauros-paldea-aqua",
    "tauros-paldean-aqua",
    "tauros-paldean-water",
  ],
  basculin: ["basculin-red-stripe", "basculin-red-striped", "basculin-red"],
  "basculin-blue-striped": ["basculin-blue-stripe", "basculin-blue"],
  "basculin-white-striped": ["basculin-white-stripe", "basculin-white"],
  tornadus: ["tornadus-incarnate"],
  thundurus: ["thundurus-incarnate"],
  landorus: ["landorus-incarnate"],
  enamorus: ["enamorus-incarnate"],
  shaymin: ["shaymin-land"],
  keldeo: ["keldeo-ordinary"],
  meloetta: ["meloetta-aria"],
  darmanitan: ["darmanitan-standard"],
  wishiwashi: ["wishiwashi-solo"],
  eiscue: ["eiscue-ice"],
  morpeko: ["morpeko-full-belly"],
  palafin: ["palafin-zero"],
  dudunsparce: ["dudunsparce-two-segment", "dudunsparce-two-segmented"],
  maushold: ["maushold-family-of-four", "maushold-four"],
  tatsugiri: ["tatsugiri-curly"],
  squawkabilly: ["squawkabilly-green-plumage", "squawkabilly-green"],
  oricorio: ["oricorio-baile"],
  minior: ["minior-red", "minior-core", "minior-meteor", "minior-red-meteor"],
  gourgeist: ["gourgeist-average"],
  pumpkaboo: ["pumpkaboo-average"],
  wormadam: ["wormadam-plant"],
  mimikyu: ["mimikyu-disguised"],
  aegislash: ["aegislash-shield"],
  zygarde: ["zygarde-50", "zygarde-50-percent"],
  "chi-yu": ["chiyu"],
  "chien-pao": ["chienpao"],
  "ting-lu": ["tinglu"],
  "wo-chien": ["wochien"],
  "kommo-o": ["kommoo"],
  "porygon-z": ["porygonz"],
  "mr-rime": ["mr rime", "mr. rime"],
  sirfetchd: ["sirfetch'd"],
  "type-null": ["type: null", "typenull"],
  flabebe: ["flabébé"],
}

export function norm(s: string): string {
  let out = (s || "").trim().toLowerCase()
  out = out.normalize("NFKD").replace(/[\u0300-\u036f]/g, "")
  out = out.replace(/♀/g, " f").replace(/♂/g, " m")
  out = out.replace(/alolan/g, "alola").replace(/galarian/g, "galar")
  out = out.replace(/hisuian/g, "hisui").replace(/paldean/g, "paldea")
  out = out.replace(/[''`.]/g, "")
  out = out.replace(/[^a-z0-9]+/g, "-")
  return out.replace(/^-+|-+$/g, "")
}

export function baseSlug(slug: string): string {
  return norm(slug).replace(/-g\d+$/, "")
}

export function isOricorioStyleSlug(slug: string): boolean {
  return ORICORIO_STYLE_SLUGS.has(norm(slug))
}

export function isRegionalSlug(slug: string): boolean {
  const n = norm(slug)
  if (PIKACHU_CAP_SLUGS.has(n) || (n.includes("pikachu-") && n.endsWith("-cap"))) {
    return false
  }
  return /-(galar|hisui|alola|paldea)(-|$)/.test(n)
}

export function isFakemonName(displayName: string): boolean {
  return FAKEMON_NAMES.has(displayName.trim())
}

export function keysFor(slug: string, display: string): Set<string> {
  const keys = new Set<string>()
  for (const k of [norm(slug), norm(display), baseSlug(slug)]) {
    if (k) keys.add(k)
  }
  const n = norm(slug)
  const extras = MANUAL_ALIASES[n]
  if (extras) {
    for (const a of extras) keys.add(norm(a))
  }
  if (n.endsWith("-hisui")) {
    keys.add(n.replace(/-hisui$/, "-hisuian"))
  }
  if (n.endsWith("-galar")) {
    keys.add(n.replace(/-galar$/, "-galarian"))
  }
  if (n.endsWith("-alola")) {
    keys.add(n.replace(/-alola$/, "-alolan"))
  }
  if (n.endsWith("-f")) {
    keys.add(`${n.slice(0, -2)}-female`)
  }
  keys.delete("")
  return keys
}
