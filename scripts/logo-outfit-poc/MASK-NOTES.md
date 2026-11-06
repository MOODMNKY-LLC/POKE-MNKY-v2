# Mask authoring notes (honest / partial)

**Base:** `public/poke-mnky/avatars/red-blue.png` (1600×1600 RGBA) — originals untouched.  
**Generator:** `author_masks.py` (re-run to regenerate; review overlays before trusting).  
**Status:** Conservatively authored **partial** clothing masks for a POC — **not** production semantic layers from a layered master file (none exists in-repo).

## What the masks INCLUDE (approx.)

| Mask | Intended regions |
|------|------------------|
| `primary-mask.png` | Red jacket panels, red cap panels/brim fills, red bag flap/strap fills, red shoe accents — where chroma seed + exclusions agree |
| `secondary-mask.png` | Blue jacket collar/yoke/panels, blue bag body, blue shoe panels |
| Union | Magenta+cyan in `mask-overlay.png` |

## What is EXPLICITLY excluded

- Face / muzzle / inner-ear skin (ellipse exclusions)
- Eye irises (would otherwise match red seed)
- Classic pokéball prop (red top must stay canonical — not team kit)
- Hands overlapping the ball
- Soft hair band under the cap (reduce fur false positives)
- Near-white logos/trim (left for identity / readability)
- Near-black line cores below luminance floor (linework preserved by staying outside mask)

## Known gaps / uncertain areas (artist follow-up)

1. **Black pants & dark undershirt** — largely unmasked (not red/blue). Team kits that recolor bottoms need separate art or a third mask.
2. **White piping, zipper, circular chest/arm logos** — intentionally left out; may look “stuck” on old palette after recolor.
3. **Deep jacket shadows** near black fur — often below chroma/luminance floors → unmasked; can leave red/blue “islands” with dark gaps.
4. **Bag-strap leather / brownish midtones** — may be under-included vs pure red strap fills.
5. **Cap white front panel** — unmasked; stays white.
6. **Rim-light / colored bounce on black fur** — not corrected; extreme kit colors may make residual bounce look odd.
7. **Mask edges** — seed+morphology, not hand-painted bezier silhouettes; expect 1–2px fringing on some panel borders under inspection.
8. **Pokéball vs wrist-cuff tradeoff** — ball holdout circle `(388,898) r=150` prioritizes keeping the prop classic. A thin band of **wrist-cuff red** near the ball may be under-included (~partial). Do not expand the mask into the ball to “fix” the cuff without artist paint.
9. **Cap brim near ears** — red brim fills near ear silhouettes are intentionally in primary; peach inner-ear skin is excluded. Residual 1px edge uncertainty at fur/brim junctions.

## What would make this production-ready

Artist-delivered layered source **or** painted alpha mattes:

- `outfit_primary`, `outfit_secondary`, optional `outfit_accent` / `logos_keep` / `props_keep`
- Aligned to 1600×1600 (and matching SVG topology if SVG path remains in UI)
- Explicit pokéball + face + fur holdouts

Until then: treat this POC as **feasibility evidence**, not shippable kit art.
