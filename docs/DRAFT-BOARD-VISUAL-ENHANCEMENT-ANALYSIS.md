# Draft Board Visual Enhancement Analysis

**Date:** February 1, 2026  
**Status:** ✅ **COMPLETE**

---

## Executive Summary

This document analyzes Thomas Frank's Notion Pokedex implementation and identifies visual enhancements for our Draft Board database. The primary improvement is adding **page covers** to enable beautiful Gallery View cards, similar to how Thomas Frank's Pokedex displays Pokémon as visual cards rather than just table rows.

---

## Research Findings

### Thomas Frank's Pokedex Approach

Thomas Frank's Notion Pokedex tutorial demonstrates a comprehensive approach to displaying Pokémon data visually in Notion. His implementation uses three key visual elements:

1. **Page Icon** (`icon` property): Small image (sprite) displayed next to the page title in database views
2. **Page Cover** (`cover` property): Large artwork banner displayed at the top of the page and prominently in Gallery View cards
3. **Sprite Property** (`files` property): Image thumbnail displayed in table views

In his code, he sets:
- `icon: { type: "external", external: { url: pokemon.sprite } }` - Uses sprite for icon
- `cover: { type: "external", external: { url: pokemon.artwork } }` - Uses official artwork for cover
- `Sprite: { files: [{ type: "external", name: "Pokemon Sprite", external: { url: pokemon.sprite } }] }` - Files property for table thumbnails

### Key Visual Difference: Icon vs Cover

**Page Icon:**
- Appears next to the page title in database views (table, gallery, board, etc.)
- Small size (~32x32px equivalent)
- Always visible in list/table views
- Used for quick visual identification

**Page Cover:**
- Appears as a large banner at the top of the page when opened
- **Prominently displayed in Gallery View cards** as the primary visual element
- Much larger than icons (typically ~1200x300px or similar aspect ratio)
- Creates the "card" aesthetic in Gallery View
- Not visible in table views (only in gallery and when page is opened)

### Gallery View Optimization

Notion's Gallery View is designed for visual browsing. Key features:

- **Card Preview Options:**
  - `Page cover`: Shows the page's cover image (recommended for visual databases)
  - `Page content`: Shows first image from page content
  - `Files & media property`: Shows images from a specific property
  - `None`: No image preview

- **Card Customization:**
  - Card size: Small, Medium, Large
  - Property visibility: Choose which properties show on cards
  - Property ordering: Control order of properties on cards
  - Image fit: Fit entire image or crop to fill card

- **Visual Impact:**
  - Gallery View with covers creates a card-based browsing experience
  - Much more visually appealing than table view for image-heavy content
  - Enables quick visual scanning of Pokémon

---

## Current Implementation Analysis

### What We Have

Our Draft Board currently implements:

1. ✅ **Page Icon**: Set to official artwork URL (`getFallbackSpriteUrl(pokemonId, false, "artwork")`)
2. ✅ **Sprite Property**: Files & media property for table thumbnails
3. ✅ **GitHub Sprite URL**: URL property for reference
4. ❌ **Page Cover**: **MISSING** - This is the key gap

### What We're Missing

The critical missing piece is the **page cover** property. Without covers:

- Gallery View cards appear empty or show only properties
- No prominent visual element for card-based browsing
- Less visually appealing compared to table view
- Missing the "card" aesthetic that makes Thomas Frank's Pokedex so engaging

### Code Gaps Identified

1. **Type Definitions** (`lib/notion/client.ts`):
   - `NotionCreatePageRequest` and `NotionUpdatePageRequest` only had `icon`, missing `cover`

2. **Populate Script** (`scripts/populate-notion-draft-board.ts`):
   - Only sets `icon`, does not set `cover`

3. **Backfill Script** (`scripts/backfill-draft-board-github-sprites.ts`):
   - Only sets `icon`, does not set `cover`

4. **Documentation** (`docs/DRAFT-BOARD-NOTION-SCHEMA.md`):
   - No mention of page covers or Gallery View optimization

---

## Implementation Changes

### 1. Type Definitions Updated

**File:** `lib/notion/client.ts`

Added `NotionPageCover` type and `cover` property to request interfaces:

```typescript
/** Page cover: external image URL (shows as large banner at top of page and prominently in Gallery View cards) */
export type NotionPageCover =
  | { type: "external"; external: { url: string } }
  | { type: "file_upload"; file_upload: { id: string } }

export interface NotionCreatePageRequest {
  // ... existing properties
  cover?: NotionPageCover
}

export interface NotionUpdatePageRequest {
  // ... existing properties
  cover?: NotionPageCover
}
```

### 2. Populate Script Updated

**File:** `scripts/populate-notion-draft-board.ts`

Added cover property to `createPage` calls:

```typescript
const artworkUrl = getFallbackSpriteUrl(pokemon.id, false, "artwork")
await createPage(notion, {
  // ... properties
  icon: {
    type: "external",
    external: { url: artworkUrl },
  },
  cover: {
    type: "external",
    external: { url: artworkUrl },
  },
})
```

### 3. Backfill Script Updated

**File:** `scripts/backfill-draft-board-github-sprites.ts`

Added cover property to `updatePage` calls:

```typescript
await updatePage(notion, page.id, {
  // ... properties
  icon: { type: "external", external: { url } },
  cover: { type: "external", external: { url } },
})
```

### 4. Documentation Updated

**File:** `docs/DRAFT-BOARD-NOTION-SCHEMA.md`

Added section explaining page covers and Gallery View optimization:

- Explanation of page covers vs icons
- Gallery View benefits
- Updated runbook instructions

---

## Visual Enhancement Strategy

### Image Source Decision

We use the **same official artwork URL** for both icon and cover:
- **Icon**: Official artwork (small, next to name)
- **Cover**: Official artwork (large, banner/card display)

This differs slightly from Thomas Frank's approach (he uses sprite for icon, artwork for cover), but using artwork for both provides:
- Consistency across views
- Higher quality images for both uses
- Simpler implementation (one URL source)

### Gallery View Configuration Recommendations

For optimal Gallery View display:

1. **Card Preview**: Set to "Page cover" (not "Page content" or "None")
2. **Card Size**: Medium or Large (Small may not show covers well)
3. **Properties to Show**: 
   - Name (always visible)
   - Point Value (important for draft)
   - Status (if needed)
   - Type 1 / Type 2 (visual type badges)
4. **Image Fit**: "Fit image" ON (shows full artwork without cropping)

### Table View Compatibility

Table View remains fully functional:
- Icons display next to names
- Sprite property shows thumbnails
- All properties accessible
- No visual regression

---

## Migration Strategy

### For New Rows

New rows created via `populate-notion-draft-board.ts` automatically get:
- ✅ Icon (artwork)
- ✅ Cover (artwork)
- ✅ Sprite property (artwork)
- ✅ GitHub Sprite URL

### For Existing Rows

Run the backfill script to add covers:

```bash
pnpm exec tsx --env-file=.env.local scripts/backfill-draft-board-github-sprites.ts
```

This updates all existing rows with:
- Icon (if missing)
- Cover (new)
- Sprite property (if missing)
- GitHub Sprite URL (if missing)

### Backward Compatibility

- All changes are additive (no breaking changes)
- Existing rows without covers still function in table view
- Gallery View works but won't show covers until backfill runs
- No data loss or schema changes required

---

## Benefits of This Enhancement

### User Experience

1. **Visual Browsing**: Gallery View enables card-based browsing similar to a digital Pokédex
2. **Quick Identification**: Large artwork makes Pokémon easy to recognize at a glance
3. **Professional Appearance**: Cards look polished and engaging
4. **Flexible Views**: Users can choose table or gallery based on preference

### Use Cases Enabled

1. **Draft Planning**: Browse available Pokémon visually before drafting
2. **Team Building**: Visual selection of Pokémon for teams
3. **Pokédex Browsing**: Casual browsing of the full catalog
4. **Presentation**: Gallery View suitable for sharing/showcasing

### Technical Benefits

1. **No Performance Impact**: Covers are external URLs, no additional storage
2. **Consistent Data Source**: Uses existing `getFallbackSpriteUrl` utility
3. **API Compliant**: Follows Notion API best practices
4. **Maintainable**: Simple implementation, easy to update

---

## Comparison: Before vs After

### Before (Current State)

**Table View:**
- ✅ Icons next to names
- ✅ Sprite thumbnails in Sprite column
- ✅ All properties visible
- ✅ Functional but utilitarian

**Gallery View:**
- ❌ No covers (cards appear empty or minimal)
- ❌ Less visually appealing
- ❌ Underutilized view option

### After (With Covers)

**Table View:**
- ✅ Icons next to names (unchanged)
- ✅ Sprite thumbnails (unchanged)
- ✅ All properties visible (unchanged)
- ✅ Same functionality, no regression

**Gallery View:**
- ✅ Large artwork covers on each card
- ✅ Beautiful card-based browsing
- ✅ Visual Pokédex experience
- ✅ Professional, engaging appearance

---

## Implementation Checklist

- [x] Add `NotionPageCover` type to `lib/notion/client.ts`
- [x] Add `cover` property to `NotionCreatePageRequest`
- [x] Add `cover` property to `NotionUpdatePageRequest`
- [x] Update `populate-notion-draft-board.ts` to set covers
- [x] Update `backfill-draft-board-github-sprites.ts` to set covers
- [x] Update documentation with cover information
- [x] Update runbook with backfill instructions

---

## Next Steps

1. **Test Implementation**: Run populate script on a test database to verify covers work
2. **Backfill Existing Rows**: Run backfill script to add covers to all existing Draft Board rows
3. **Configure Gallery View**: In Notion, create a Gallery View and configure:
   - Card preview: Page cover
   - Card size: Medium or Large
   - Properties: Name, Point Value, Status, Types
4. **User Testing**: Gather feedback on Gallery View usability
5. **Optional Enhancements**: Consider additional Gallery View optimizations:
   - Custom card layouts
   - Property grouping
   - Filter presets for Gallery View

---

## References

- [Thomas Frank's Notion API Crash Course](https://thomasjfrank.com/notion-api-crash-course/)
- [Notion API Page Reference](https://developers.notion.com/reference/page)
- [Notion Gallery View Guide](https://www.notion.com/help/guides/gallery-view-databases)
- [Notion API Changelog: Page Icons and Cover Images](https://developers.notion.com/changelog/page-icons-cover-images-new-block-types-and-improved-page-file-properties)

---

## Conclusion

Adding page covers to the Draft Board enables beautiful Gallery View cards that transform the browsing experience from utilitarian table rows to engaging visual cards. This enhancement brings our Draft Board in line with best practices demonstrated by Thomas Frank's Pokedex while maintaining full backward compatibility and table view functionality.

The implementation is straightforward, uses existing utilities, and requires no schema changes. Existing rows can be updated via the backfill script, and new rows automatically include covers.
