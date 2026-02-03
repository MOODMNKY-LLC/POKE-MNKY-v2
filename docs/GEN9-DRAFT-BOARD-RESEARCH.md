# Gen 9 Draft Board Research Summary

**Purpose**: Canonical scope, point tiers, and bans for populating the Notion Draft Board and syncing to Supabase. Aligns with league rules and pokenode-ts/PokeAPI.

---

## Theme A: Gen 9 scope

- **PokeAPI Gen 9 IDs**: 906–1025 (species introduced in Scarlet/Violet; `determineGeneration(id)` returns 9 for id > 905).
- **Included**: All species in this ID range (Paldea dex, DLC species, Paradox, convergent forms as separate species where they have distinct IDs). Alternate forms that are separate PokeAPI species (e.g. different `pokemon.id`) are included as separate rows when they have different stats/names.
- **Name normalization**: Use PokeAPI `name` (kebab-case); display name can be title-cased (e.g. "walking-wake" → "Walking Wake") for Notion/UI.
- **Single canonical list**: Script fetches by ID range 906–1025 and filters by `determineGeneration(id) === 9`; any new Gen 9 species added by PokeAPI in this range are included automatically.

---

## Theme B: Point tiers (1–20)

- **Source**: Reuse logic from [scripts/sync-pokemon-data.ts](scripts/sync-pokemon-data.ts): `calculateDraftCost(pokemon)` based on base stat total (BST).
- **Mapping**:
  - BST ≥ 600 → 20 (legendary/pseudo-legendary)
  - BST ≥ 540 → 15 (very strong)
  - BST ≥ 500 → 12 (strong)
  - BST ≥ 450 → 10 (average)
  - BST ≥ 400 → 8 (below average)
  - else → 5 (weak)
- **League**: Point values 1–20 per `draft_pool`; league rules also mention 12–20 in one place; we use full 1–20 range and BST tiers above (capped 5–20 from BST; 1–4 can be used for league-specific manual overrides in Notion).
- **Admin override**: Notion Draft Board allows editing Point Value per row; sync to Supabase uses Notion as source of truth for point value.

---

## Theme C: Bans and Tera Captain eligibility

**League rules** (from [.cursor/rules/league-rules.mdc](.cursor/rules/league-rules.mdc)):

- **Consider for add/remove from draft pool**: Pokemon of Ruin (Wo-Chien, Chien-Pao, Ting-Lu, Chi-Yu), Urshifu (both forms), box legendaries (Koraidon, Miraidon), Terapagos, Paradox (e.g. Gouging Fire, Raging Bolt, Flutter Mane).
- **Banned moves** (do not affect pool inclusion; affect battle legality): Dark Void (Darkrai), Last Respects (Basculegion, Houndstone), Relic Song (Meloetta), Shed Tail (Cyclizar).

**Canonical bans (Status = Banned, excluded from available pool)**:

- Pokemon of Ruin: wo-chien, chien-pao, ting-lu, chi-yu
- Urshifu: urshifu-single-strike, urshifu-rapid-strike (or urshifu with form handling)
- Box legendaries: koraidon, miraidon
- Terapagos: terapagos
- Paradox (if league bans): gouging-fire, raging-bolt, flutter-mane (and any others per league vote)

**Tera Captain ineligible** (can be in pool but `tera_captain_eligible = false`):

- Same list as banned can be marked Tera ineligible if league allows them in pool but not as Tera Captain; or league may ban entirely (Status = Banned). For simplicity, banned Pokémon are not in the available pool; if a Pokémon is in the pool but not Tera Captain, set `Tera Captain Eligible = false` in Notion.

**Implementation**: A list of PokeAPI names (or IDs) that are banned; script sets `status: 'banned'` and `tera_captain_eligible: false` for those. All other Gen 9 species get `status: 'available'` and `tera_captain_eligible: true` unless league adds a "Tera ineligible only" list later.

---

## Data flow

1. **Script** (pokenode-ts): Fetch IDs 906–1025 → filter Gen 9 → apply `calculateDraftCost` → apply bans list → output `{ name, pokemon_id, point_value, status, tera_captain_eligible, generation: 9 }`.
2. **Notion**: Create/update Draft Board rows from that output (Name, Point Value, Status, Tera Captain Eligible, Pokemon ID, Generation, Notes).
3. **Sync**: Notion → Supabase `draft_pool` (preserve `drafted` state); optional Supabase → Notion for draft state.
