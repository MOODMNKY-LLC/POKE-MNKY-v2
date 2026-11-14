import type { RestrictionSeed } from "@/lib/draft-pool-builder/types"

/**
 * Season 8 banned moves/abilities + global combo (Matt / league rules).
 * Sheet-name keyed so the importer can attach pokemon_id after alias resolution.
 */
export const SEASON_RESTRICTION_SEEDS: RestrictionSeed[] = [
  {
    kind: "move",
    name: "Dark Void",
    sheetName: "Darkrai",
    note: "Banned on Darkrai",
  },
  {
    kind: "move",
    name: "Last Respects",
    sheetName: "Basculegion",
    note: "Banned on Basculegion",
  },
  {
    kind: "move",
    name: "Last Respects",
    sheetName: "Houndstone",
    note: "Banned on Houndstone",
  },
  {
    kind: "move",
    name: "Relic Song",
    sheetName: "Meloetta",
    note: "Banned on Meloetta",
  },
  {
    kind: "move",
    name: "Shed Tail",
    sheetName: "Cyclizar",
    note: "Banned on Cyclizar",
  },
  {
    kind: "move",
    name: "Shed Tail",
    sheetName: "Orthworm",
    note: "Banned on Orthworm",
  },
  {
    kind: "ability",
    name: "Speed Boost",
    sheetName: "Blaziken",
    note: "Banned on Blaziken",
  },
  {
    kind: "ability",
    name: "Speed Boost",
    sheetName: "Espathra",
    note: "Banned on Espathra",
  },
  {
    kind: "ability",
    name: "Supreme Overlord",
    sheetName: "Kingambit",
    note: "Banned on Kingambit",
  },
  {
    kind: "move",
    name: "Take Heart",
    sheetName: "Manaphy",
    note: "Banned on Manaphy",
  },
  {
    kind: "move",
    name: "Transform",
    sheetName: "Mew",
    note: "Banned on Mew",
  },
  {
    kind: "move",
    name: "Surging Strikes",
    sheetName: "Urshifu Rapid Strike",
    note: "Banned on Urshifu Rapid Strike",
  },
  {
    kind: "move",
    name: "Wicked Blow",
    sheetName: "Urshifu",
    note: "Banned on Urshifu Single Strike (sheet name Urshifu)",
  },
  {
    kind: "move",
    name: "Tera Starstorm",
    sheetName: "Terapagos",
    note: "Banned on Terapagos",
  },
  {
    kind: "combo",
    name: "Substitute into Baton Pass",
    sheetName: null,
    note: "Global combo ban: Substitute into Baton Pass is not allowed",
  },
]

/** Default Tera-ban display names (season-editable; seeded from Draft Board col G). */
export const DEFAULT_TERA_BAN_NAMES = [
  "Cetitan",
  "Chandelure",
  "Comfey",
  "Floatzel",
  "Frosmoth",
  "Braviary Hisuian",
  "Oricorio",
  "Tauros Paldean Aqua",
  "Tauros Paldean Blaze",
  "Rotom",
  "Rotom Fan",
  "Rotom Frost",
  "Rotom Mow",
  "Venomoth",
] as const
