# Logo → outfit recolor — offline POC

**Not the full product feature.** Tooling + fixtures only: no app routes, schema, storage, RLS, feature flags, or production UI.

**Base SHA expectation:** branch from `main` @ `ffd9d6d` (PR31 merged).  
**Jev:** optional later ranking only — **this POC does not call Jev** (`jevExercised=false`).

## Intent (t24u + t25u)

Recognizable **source-palette swap** of plain red/blue outfit fabric (and optionally coordinated Poké Ball chromatic panels) into coach/team primary/secondary colors, while **preserving** black/white/neutral clothing, linework, face/skin/fur/eyes/hands, emblems, and shading.

- Ball chromatic top **may remappart** of primary (matches system palette-switch permission; stock `gold-black` also changes the ball).
- Ball white/black/seam/highlights stay protected via monochrome gates.
- Not a global red/blue replace, whole-image filter, or generative redraw.

## What you get

1. Source-color-aware **partial** primary/secondary fabric masks (`masks/`, see `MASK-NOTES.md`) + annotated **selection map**.
2. Three **EXAMPLE** synthetic logos + resolved palettes.
3. Recolored PNG previews, mobile plates, contact sheet under `out/`.
4. Export pack under `/opt/cursor/artifacts/logo-outfit-poc/final/` (before+3after, swatch legend, ball/emblem/neutral crops, SHA256SUMS tied to git HEAD).
5. Vitest: outside-mask / alpha / determinism / B/W-neutral protect / ball policy / face / emblems / shading order.

## Reproduce

```bash
python3 scripts/logo-outfit-poc/author_masks.py
python3 scripts/logo-outfit-poc/make_fixture_logos.py
pnpm logo-outfit:poc
pnpm logo-outfit:validate
pnpm logo-outfit:test
pnpm logo-outfit:export
```

Or: `pnpm logo-outfit:all`

## Fixtures (example data — not Matt’s logos)

| ID | Intent |
|----|--------|
| `contrast-green-purple` | Deterministic suggestions from high-chroma logo |
| `mono-grayscale` | Monochrome path — dark primary / light secondary |
| `bw-gold-override` | Explicit coach-style override (teal/orange) despite B/W+gold logo |

## Invariants

- Outside `union(primary, secondary)` → bitwise-identical to base; **alpha** never changes.
- Protected B/W/neutral pixels → unchanged and not in masks.
- Ball neutrals unchanged; ball chroma **may** change (t25u intentional).
- Face/hands/emblem samples unchanged.
- Deterministic for the same palette.

## Verdict

**Partial with artist follow-up.** Pipeline proves a luminance-preserving fabric palette-swap **can** recolor selected clothing (+ ball chroma) while preserving identity/neutrals **where selection is correct**. Masks are **partial**; artist follow-up required for production. This is **not** the full product feature.
