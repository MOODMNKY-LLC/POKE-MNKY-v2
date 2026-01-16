# PokéAPI Documentation Site - Footer Credits Added ✅

**Date**: January 15, 2026  
**Status**: ✅ Footer Credits and GitHub Links Added  
**Update**: Simeon Bowman and MOODMNKY LLC added to footer with GitHub links

---

## Summary

Added **Simeon Bowman** and **MOODMNKY LLC** to the footer's "Created by" section with GitHub links, and updated the thanks section in the About page to include clickable GitHub links. All links will display in Pokémon Yellow (`#FFDE00`) matching the site's link styling.

---

## Footer Updates

### "Created by" Section

**File**: `/home/moodmnky/POKE-MNKY/tools/pokeapi-docs/src/components/Footer/Footer.js`

**Before**:
```jsx
Created by <a href="https://github.com/phalt">Paul Hallett</a> and other 
<a href="https://github.com/PokeAPI/pokeapi/graphs/contributors">PokéAPI contributors</a> 
around the world. Pokémon and Pokémon character names are trademarks of Nintendo.
```

**After**:
```jsx
Created by <a href="https://github.com/phalt">Paul Hallett</a> and other 
<a href="https://github.com/PokeAPI/pokeapi/graphs/contributors">PokéAPI contributors</a> 
around the world. The Average at Best Battle League platform and this documentation site 
were developed by <a href="https://github.com/MOODMNKY-LLC">Simeon Bowman</a> under 
<a href="https://github.com/MOODMNKY-LLC">MOODMNKY LLC</a>. 
Pokémon and Pokémon character names are trademarks of Nintendo.
```

**Changes**:
- ✅ Added mention of Average at Best Battle League platform
- ✅ Added **Simeon Bowman** with GitHub link (`https://github.com/MOODMNKY-LLC`)
- ✅ Added **MOODMNKY LLC** with GitHub link (`https://github.com/MOODMNKY-LLC`)
- ✅ Links will display in Pokémon Yellow (`#FFDE00`) matching site's link styling

---

## About Page Updates

### "Where did you get all of this data?" FAQ - Thanks Section

**File**: `/home/moodmnky/POKE-MNKY/tools/pokeapi-docs/src/pages/about.js`

**Before**:
```jsx
<li>
    <strong>Simeon Bowman</strong> of <strong>MOODMNKY LLC</strong>, who developed and maintains 
    the Average at Best Battle League platform and this custom API documentation site, bringing 
    comprehensive Pokémon data to the competitive league community.
</li>
```

**After**:
```jsx
<li>
    <a href="https://github.com/MOODMNKY-LLC">
        <strong>Simeon Bowman</strong>
    </a>{' '}
    of{' '}
    <a href="https://github.com/MOODMNKY-LLC">
        <strong>MOODMNKY LLC</strong>
    </a>, who developed and maintains 
    the Average at Best Battle League platform and this custom API documentation site, bringing 
    comprehensive Pokémon data to the competitive league community.
</li>
```

**Changes**:
- ✅ **Simeon Bowman** name now links to GitHub (`https://github.com/MOODMNKY-LLC`)
- ✅ **MOODMNKY LLC** name now links to GitHub (`https://github.com/MOODMNKY-LLC`)
- ✅ Links will display in Pokémon Yellow (`#FFDE00`) matching site's link styling
- ✅ Maintains bold styling for emphasis

---

## Link Styling

### Color

All links use the site's dark mode link color:
- **Pokémon Yellow**: `#FFDE00` (oklch 0.885 0.176 95)
- Defined in `constants.scss` as `$link-color-dark`
- Applied via `global.scss` link styles

### Visual Consistency

✅ **Footer Links**: Match existing PokéAPI contributor links  
✅ **About Page Links**: Match other GitHub links in thanks section  
✅ **Hover States**: Gold hover effect (`#B3A125`) for consistency  
✅ **Accessibility**: Proper link semantics and contrast

---

## GitHub Links

### Organization URL

**URL**: `https://github.com/MOODMNKY-LLC`

**Rationale**:
- Links to MOODMNKY-LLC organization page
- Shows all repositories including POKE-MNKY-v2
- Provides context for company/developer
- Consistent with other GitHub links on site

### Link Placement

1. **Footer**: "Created by" section - visible on all pages
2. **About Page**: "Thanks" section - detailed attribution

---

## Files Modified

1. ✅ `/home/moodmnky/POKE-MNKY/tools/pokeapi-docs/src/components/Footer/Footer.js`
   - Added Simeon Bowman and MOODMNKY LLC to footer
   - Added GitHub links for both

2. ✅ `/home/moodmnky/POKE-MNKY/tools/pokeapi-docs/src/pages/about.js`
   - Updated thanks section with GitHub links
   - Made names clickable

---

## Build Status

✅ **Build Successful**: React components compiled without errors  
✅ **Container Restarted**: Site is live with footer credits  
✅ **No Errors**: Clean build output

---

## Visual Result

### Footer

- **Before**: Only PokéAPI contributors mentioned
- **After**: Includes league platform developer with GitHub links
- **Links**: Display in Pokémon Yellow (`#FFDE00`)
- **Visibility**: Appears on every page

### About Page

- **Before**: Bold text only (not clickable)
- **After**: Clickable links to GitHub
- **Links**: Display in Pokémon Yellow (`#FFDE00`)
- **Consistency**: Matches other GitHub links in section

---

## Summary

✅ **Footer Credits**: Simeon Bowman and MOODMNKY LLC added to footer  
✅ **GitHub Links**: All names link to `https://github.com/MOODMNKY-LLC`  
✅ **Link Styling**: Links display in Pokémon Yellow matching site theme  
✅ **Consistency**: Matches existing link patterns and styling  
✅ **Visibility**: Footer visible on all pages, About page provides detailed attribution

The PokéAPI documentation site now includes proper GitHub-linked credits for Simeon Bowman and MOODMNKY LLC in both the footer and About page, with all links displaying in the site's signature Pokémon Yellow color.

---

**Update Date**: January 15, 2026  
**Completed By**: POKE MNKY (app) agent  
**Status**: ✅ Complete and Live
