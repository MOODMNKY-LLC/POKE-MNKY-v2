# Mask authoring notes (honest / partial)

**Base:** `public/poke-mnky/avatars/red-blue.png` (1600×1600 RGBA) — originals untouched.  
**Generator:** `author_masks.py` (re-run to regenerate; review `selection-map-annotated.png` before trusting).  
**Status:** Conservatively authored **partial** fabric masks for a POC — **not** production semantic layers from a layered master file (none exists in-repo).

## Policy (t24u + t25u)

| Rule | Behavior |
|------|----------|
| Plain red fabric (cap/vest panels, etc.) | → kit **primary** (luminance-preserving swap) |
| Plain blue fabric | → kit **secondary** |
| Poké Ball chromatic top | **MAY remappart** of primary (intentional — system stock `gold-black` also recolors the ball; not isomorphic) |
| Ball white / black / seam / highlights | **Protected** via monochrome gates |
| Black/white/neutral clothing, linework | **Protected** (never in masks) |
| Face / fur / eyes / hands / skin / **ears** | **Protected** (identity ellipses fitted to full-res silhouettes, incl. dark maroon cavities) |
| Emblem / logo discs (chest, bag) | **Protected** (disc holdouts + near-white) |

## What the masks INCLUDE (approx.)

| Mask | Intended regions |
|------|------------------|
| `primary-mask.png` | Chromatic red clothing fills + ball red top where chroma seed agrees |
| `secondary-mask.png` | Chromatic blue clothing fills (collar/yoke/panels, bag body fills, shoe accents) |
| Selection map | Red = primary eligible; blue = secondary; amber = identity protect; gray = B/W/neutral |

## What is EXPLICITLY excluded

- Face / muzzle / **full ear silhouettes including dark maroon inner cavities** (not bright-peach-only)
- Eye irises (would otherwise match red seed)
- Hands overlapping the ball (expanded for dark finger skin)
- Soft hair band under the cap
- Near-white logos/trim/emblems
- Near-black / low-chroma neutrals and line cores
- Emblem discs (chest + bag circular logos)

**Regression (2ef33e8):** guessed ear ellipses stopped too high; right-ear ROI had ~2215 recolored ear-flesh px (e.g. `(1065,535)` RGB `(115,48,46)` → purple/teal). Fixed by silhouette-fitted ear holdouts + local ear-flesh strip. Old failing masks kept under `regression/` for tests that prove old fails / new passes.

## Known gaps / uncertain areas (artist follow-up)

1. **Black pants & dark undershirt** — unmasked (neutral). Team kits that recolor bottoms need separate art or a third mask.
2. **White piping, zipper, circular logos** — intentionally left out; may look “stuck” on old palette after recolor.
3. **Deep jacket shadows** near black fur — often below chroma floors → unmasked; can leave red/blue “islands” with dark gaps.
4. **Bag-strap leather / brownish midtones** — may be under-included vs pure red strap fills; branded bag graphics protected.
5. **Cap white front panel** — unmasked; stays white. Plain red cap fabric is eligible; emblem protected.
6. **Rim-light / colored bounce on black fur** — not corrected.
7. **Mask edges** — seed+morphology, not hand-painted; expect 1–2px fringing. If a mask cannot be made exact, treat as **partial uncertainty**.
8. **Poké Ball (t25u)** — chromatic top is eligible for primary swap; white/black/seam protected. Stock `gold-black.png` is a separate redraw (~97% pixels differ) — reference that ball *may* change, not a pixel mapping target. Prior failing ROI `(388,898,r=150)` missed the ball; current geometry `(394,756,r=148)`.
9. **Cap brim near ears** — ear holdouts intentionally prefer keeping adjacent brim cloth unmasked over leaking into ear flesh; some red brim near ears may stay original.
10. **Shoe / prop details** — conservative; only unambiguously chromatic fabric panels included.

## What would make this production-ready

Artist-delivered layered source **or** painted alpha mattes:

- `outfit_primary`, `outfit_secondary`, optional `outfit_accent` / `logos_keep` / `props_keep` / `ball_chroma`
- Aligned to 1600×1600 (and matching SVG topology if SVG path remains in UI)

Until then: treat this POC as **feasibility evidence**, not shippable kit art.
