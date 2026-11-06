# Logo → outfit recolor — offline POC

**Not the full product feature.** Tooling + fixtures only: no app routes, schema, storage, RLS, feature flags, or production UI.

**Base SHA expectation:** branch from `main` @ `ffd9d6d` (PR31 merged).  
**Jev:** optional later ranking only — **this POC does not call Jev** (`jevExercised=false`).

## What you get

1. Conservatively authored **partial** primary/secondary clothing masks for `red-blue.png` (`masks/`, see `MASK-NOTES.md`).
2. Three **EXAMPLE** synthetic logos + resolved palettes (suggestions and one explicit override).
3. Recolored PNG previews, mobile-size light/dark plates, mask overlay, and a contact sheet under `out/`.
4. Vitest coverage for dimensions, alpha, outside-mask invariance, determinism, mono suggestion.

## Reproduce

From repo root (Python 3 + Pillow for mask/logo authoring; Node for composite):

```bash
# 1) Author masks (writes scripts/logo-outfit-poc/masks/*.png)
python3 scripts/logo-outfit-poc/author_masks.py

# 2) EXAMPLE fixture logos
python3 scripts/logo-outfit-poc/make_fixture_logos.py

# 3) Composite + contact sheet + report.json
pnpm logo-outfit:poc

# 4) Focused tests
pnpm logo-outfit:test
```

Or all-in-one: `pnpm logo-outfit:all`

## Fixtures (example data — not Matt’s logos)

| ID | Intent |
|----|--------|
| `contrast-green-purple` | Deterministic suggestions from high-chroma logo |
| `mono-grayscale` | Monochrome path — dark primary / light secondary |
| `bw-gold-override` | Explicit coach-style override (teal/orange) despite B/W+gold logo |

## Invariants checked

- Decoded pixels **outside** `union(primary, secondary)` are bitwise-identical to the base.
- **Alpha** never changes.
- Mask union is **non-vacuous** but not whole-character (see tests).

## Verdict (see also `out/report.json` + `/opt/cursor/artifacts/logo-outfit-poc/`)

**Partial with artist follow-up.** Pipeline proves luminance-preserving kit tint **can** recolor masked clothing while preserving face/fur/eyes/ball/transparency **where masks are correct**. Masks are **partial**; artist follow-up required for production (pants, white trim, shadow islands, cuff-near-ball, edge paint). This is **not** the full product feature.
