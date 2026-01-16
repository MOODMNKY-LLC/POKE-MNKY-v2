# Replay Layout Analysis: Custom vs Official Showdown

**Date**: January 15, 2026  
**Analysis Method**: Deep Thinking + Web Scraping  
**Status**: Complete Investigation

---

## Problem Statement

The custom replay viewer at `https://aab-replay.moodmnky.com/gen9randombattle-35` doesn't match the layout and appearance of the official Pokémon Showdown replay viewer at `https://replay.pokemonshowdown.com/oumonotype-82345404`.

---

## Key Differences Identified

### 1. **Sidebar Layout Structure**

**Custom Version**:
- Has a sidebar (`<div class="sidebar">`) containing format information
- Uses `.bar-wrapper.has-sidebar` and `.mainbar.has-sidebar` CSS classes
- Format info appears in sidebar instead of battle log
- Wraps battle in `<div class="replay-stage">` with custom centering

**Official Version**:
- No sidebar structure
- Format information appears in the battle log
- Simpler, cleaner layout without sidebar modifications

**CSS Differences**:
```css
/* Custom version adds: */
.bar-wrapper.has-sidebar { max-width: 1430px; }
.mainbar.has-sidebar { margin-left: 330px; }
.mainbar.has-sidebar .replay-stage { margin-left: 0px; }
.replay-stage { margin-left: auto !important; margin-right: auto !important; }

/* Official version: */
.bar-wrapper { max-width: 1100px; margin: 0px auto; }
.mainbar { margin: 0px; padding-right: 1px; }
/* No sidebar CSS */
```

### 2. **Pokemon Sprite Display**

**Custom Version**:
- Shows "Not revealed" pokeball icons (`pokemonicons-pokeball-sheet.png`)
- All team slots show generic pokeball icons
- No actual Pokemon sprites visible in team preview

**Official Version**:
- Shows actual Pokemon sprites (`pokemonicons-sheet.png`)
- Team preview displays Pokemon icons correctly
- Sprites load from `https://play.pokemonshowdown.com/sprites/`

**HTML Differences**:
```html
<!-- Custom version -->
<span class="picon" style="background:transparent url(https://aab-play.moodmnky.com/sprites/pokemonicons-pokeball-sheet.png) no-repeat scroll -0px 4px" title="Not revealed" aria-label="Not revealed"></span>

<!-- Official version -->
<span class="picon has-tooltip" data-tooltip="pokemon|0|0" style="background:transparent url(https://play.pokemonshowdown.com/sprites/pokemonicons-sheet.png?v20) no-repeat scroll -160px -870px" aria-label="Kecleon"></span>
```

### 3. **Format Information Location**

**Custom Version**:
- Format info in sidebar section:
  ```html
  <div class="sidebar">
    <section class="section first-section">
      <p><small>Format:</small><br><strong>[Gen 9] Random Battle</strong></p>
      <div>
        <p><small><em>pecies Clause:</em> Limit one of each Pokémon</small></p>
        <!-- ... -->
      </div>
    </section>
  </div>
  ```

**Official Version**:
- Format info in battle log:
  ```html
  <div class="battle-log">
    <div class="inner message-log">
      <div class=""><small>Format:</small> <br><strong>OU Monotype</strong></div>
      <div class=""><small><em>Same Type Clause:</em> Pokemon in a team must share a type</small></div>
      <!-- ... -->
    </div>
  </div>
  ```

### 4. **Additional Custom Styling**

**Custom Version**:
- Custom background styling:
  ```css
  body { background: url("//aab-play.moodmnky.com/fx/client-bg-pokeball.png") center center / cover no-repeat fixed rgb(52, 75, 108); }
  body.dark { background: url("//aab-play.moodmnky.com/fx/client-bg-masterball.png") center center / cover no-repeat fixed rgb(0, 0, 0); }
  ```
- Custom header styling with different navigation appearance
- Additional JavaScript for preferences/bootstrap

**Official Version**:
- Standard Showdown styling
- No custom background images
- Standard header/navigation

---

## Root Causes

1. **Sidebar Layout**: Custom CSS intentionally adds a sidebar structure for format information, which differs from official Showdown's design
2. **Sprite Loading**: Pokemon sprites aren't loading properly - showing "Not revealed" icons instead of actual Pokemon. This could be:
   - Random Battle format hiding teams until revealed (expected behavior)
   - Sprite path issues
   - Missing sprite data
   - JavaScript not populating team data correctly
3. **Layout Modifications**: The `.replay-stage` wrapper and custom centering CSS further modify the layout

---

## Recommendations

### Option 1: Match Official Showdown Layout (Recommended)

To match the official Showdown replay viewer exactly:

1. **Remove Sidebar CSS**:
   - Remove or disable `.has-sidebar` classes
   - Remove `.sidebar` div structure
   - Remove `.replay-stage` wrapper modifications
   - Restore format information to battle log

2. **Fix Sprite Loading**:
   - Ensure Pokemon sprites load correctly (check sprite paths)
   - Verify sprite data is available at `aab-play.moodmnky.com/sprites/`
   - Check if Random Battle format should show team previews (may be intentional to hide teams)

3. **Simplify Layout**:
   - Use standard Showdown CSS without custom sidebar modifications
   - Match official `.bar-wrapper` and `.mainbar` structure

### Option 2: Keep Custom Layout, Fix Sprites Only

If the sidebar layout is intentional:

1. **Fix Sprite Loading**:
   - Investigate why Pokemon sprites show "Not revealed"
   - Check if this is Random Battle format behavior (teams hidden until revealed)
   - Verify sprite paths and data availability

2. **Improve Sidebar**:
   - Ensure sidebar doesn't interfere with battle display
   - Match official Showdown's visual styling within sidebar

---

## Technical Details

### Custom CSS Location

The custom CSS appears to be inline in the HTML `<head>` section:
```html
<style rel="stylesheet" type="text/css">
  /* Custom sidebar CSS */
  .bar-wrapper.has-sidebar { max-width: 1430px; }
  .mainbar.has-sidebar { margin-left: 330px; }
  /* ... */
</style>
```

### Sprite Paths

**Custom**: `https://aab-play.moodmnky.com/sprites/pokemonicons-pokeball-sheet.png`  
**Official**: `https://play.pokemonshowdown.com/sprites/pokemonicons-sheet.png?v20`

### Files to Modify

The replay viewer appears to be part of the Showdown client instance. Modifications would need to be made to:
- Showdown client CSS files (likely in `/style/` directory)
- Showdown client HTML templates (replay viewer template)
- Possibly server-side configuration

---

## Next Steps

1. **Identify Customization Source**: Determine where the sidebar CSS is added (Showdown client customization, server config, or separate CSS file)
2. **Check Sprite Availability**: Verify sprites are properly synced and accessible
3. **Test Random Battle Format**: Confirm if "Not revealed" is expected behavior for Random Battle replays
4. **Compare Other Formats**: Check if other battle formats show sprites correctly
5. **Make CSS Changes**: Remove sidebar CSS if matching official layout, or fix sprite loading if keeping custom layout

---

## References

- Official Showdown Replay: `https://replay.pokemonshowdown.com/oumonotype-82345404`
- Custom Replay: `https://aab-replay.moodmnky.com/gen9randombattle-35`
- Showdown Client: `https://aab-play.moodmnky.com/`
- Showdown Server: `https://aab-showdown.moodmnky.com/`

---

**Last Updated**: January 15, 2026  
**Status**: Analysis Complete - Awaiting Implementation Decision
