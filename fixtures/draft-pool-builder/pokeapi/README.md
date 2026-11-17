# PokeAPI-derived evolution families

`species_families.csv` feeds `public.draft_pool_species_families`, which backs the draft-pool
species clause (one Pokémon per evolution line, all forms included).

## Provenance

- Source: [PokeAPI](https://github.com/PokeAPI/pokeapi) commit
  `7764ee08de86ac11031ae2b883b598599af2b960`, files `data/v2/csv/pokemon.csv` and
  `data/v2/csv/pokemon_species.csv`.
- Coverage: every pokemon id in `pokemon.csv` (1,351 ids, including forms `> 10000`). Ids and
  identifiers match production `pokepedia_pokemon` exactly.

## Algorithm

For every pokemon id: `family_key = 'chain:' || evolution_chain_id` of its species
(`pokemon.species_id -> pokemon_species.evolution_chain_id`).

### Split overrides (Matt's ruling, Nov 17)

These count as separate species and use `split:*` keys instead of their chain key:

| Pokémon | family_key |
| --- | --- |
| Indeedee M / F | `split:indeedee-male` / `split:indeedee-female` |
| Meowstic M (+ mega) / F (+ mega) | `split:meowstic-male` / `split:meowstic-female` |
| Basculin Red / Blue / White-Striped | `split:basculin-red-striped` / `split:basculin-blue-striped` / `split:basculin-white-striped` |
| Basculegion M and F | `split:basculin-white-striped` (White-Striped's line) |
| Oinkologne M / F | `split:oinkologne-male` / `split:oinkologne-female` |
| Espurr | both Meowstic keys (two rows) |
| Lechonk | both Oinkologne keys (two rows) |

A Pokémon conflicts with a roster member when their key sets overlap.

## Totals

1,353 rows, 545 distinct keys. md5 of the lines `"<pokepedia_id>,<family_key>"` sorted by
(id, key) and joined with `\n` (no trailing newline): `7cd7085d662026cbd4cb8d28be77da55`.

## Regenerating the migration seed

```
pnpm exec tsx scripts/draft-pool/generate-species-families.ts          # rewrite
pnpm exec tsx scripts/draft-pool/generate-species-families.ts --check  # drift check
```

`lib/draft-pool-builder/species-families.test.ts` asserts the totals above and that the committed
migration seed equals the generator output.
