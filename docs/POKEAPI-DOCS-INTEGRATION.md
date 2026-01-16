# PokéAPI Documentation Site - Phase 2 Integration Guide

**Date**: January 15, 2026  
**Purpose**: Instructions for POKE MNKY (app) agent to integrate documentation site into Next.js app  
**Status**: Ready for Implementation

---

## Overview

The PokéAPI documentation site (`pokeapi-docs`) is now deployed and accessible at:
- **Production URL**: `https://pokeapi-docs.moodmnky.com`
- **Local Development**: `http://10.3.0.119:8090` (when developing on different machine)
- **Container**: `poke-mnky-pokeapi-docs` (running on server)

This document provides detailed instructions for integrating the documentation site into the Next.js application.

---

## Integration Options

### Option 1: Embedded Route (Recommended)

Create a `/docs/api` route in the Next.js app that embeds the documentation site via iframe or direct integration.

**Implementation Steps**:

1. **Create Route**: `/app/docs/api/page.tsx`
   ```typescript
   'use client'
   
   import { useEffect, useState } from 'react'
   
   export default function ApiDocsPage() {
     const [isLoading, setIsLoading] = useState(true)
     const docsUrl = process.env.NEXT_PUBLIC_POKEAPI_DOCS_URL || 'https://pokeapi-docs.moodmnky.com'
     
     return (
       <div className="w-full h-screen">
         <iframe
           src={docsUrl}
           className="w-full h-full border-0"
           title="PokéAPI Documentation"
           onLoad={() => setIsLoading(false)}
         />
         {isLoading && (
           <div className="absolute inset-0 flex items-center justify-center bg-white">
             <div className="text-lg">Loading documentation...</div>
           </div>
         )}
       </div>
     )
   }
   ```

2. **Add Navigation Link**: Add to your main navigation component
   ```typescript
   <Link href="/docs/api">API Documentation</Link>
   ```

3. **Environment Variable**: Add to `.env.local` (development) and Vercel (production)
   ```
   NEXT_PUBLIC_POKEAPI_DOCS_URL=https://pokeapi-docs.moodmnky.com
   ```

**Pros**: 
- Simple implementation
- No build-time dependencies
- Always shows latest docs
- Easy to maintain

**Cons**:
- Iframe limitations (no deep linking, separate scroll context)
- Slight performance overhead

### Option 2: Direct Link (Simplest)

Simply link to the documentation site from your app without embedding.

**Implementation Steps**:

1. **Add Link Component**: In your navigation or footer
   ```typescript
   <a 
     href="https://pokeapi-docs.moodmnky.com" 
     target="_blank" 
     rel="noopener noreferrer"
   >
     API Documentation
   </a>
   ```

2. **Add to Help/Resources Page**: Create or update `/app/help/page.tsx`
   ```typescript
   export default function HelpPage() {
     return (
       <div>
         <h1>Resources & Documentation</h1>
         <section>
           <h2>API Documentation</h2>
           <p>
             View complete PokéAPI reference documentation:
           </p>
           <a 
             href="https://pokeapi-docs.moodmnky.com" 
             target="_blank"
             className="button"
           >
             Open API Docs →
           </a>
         </section>
       </div>
     )
   }
   ```

**Pros**: 
- Simplest implementation
- No iframe limitations
- Opens in new tab (users can bookmark)

**Cons**:
- Users leave your app
- Less integrated experience

### Option 3: Enhanced Pokédex Integration (Advanced)

Add API documentation links directly to Pokémon detail pages.

**Implementation Steps**:

1. **Update Pokédex Component**: In `/app/pokedex/[name]/page.tsx` or similar
   ```typescript
   export default function PokemonDetailPage({ params }: { params: { name: string } }) {
     const pokemonName = params.name
     const apiDocsUrl = `https://pokeapi-docs.moodmnky.com/docs/v2#pokemon-section`
     
     return (
       <div>
         {/* Existing Pokémon details */}
         
         <section className="mt-8">
           <h2>API Reference</h2>
           <p>View this Pokémon's API endpoint documentation:</p>
           <a 
             href={`${apiDocsUrl}`}
             target="_blank"
             className="link"
           >
             View API Documentation →
           </a>
           <p className="text-sm text-gray-600 mt-2">
             Endpoint: <code>/api/v2/pokemon/{pokemonName}</code>
           </p>
         </section>
       </div>
     )
   }
   ```

2. **Add to Team Builder**: When displaying move/ability information
   ```typescript
   // In team builder component
   <MoveTooltip move={move}>
     <a 
       href={`https://pokeapi-docs.moodmnky.com/docs/v2#moves-section`}
       target="_blank"
       className="text-xs text-blue-600"
     >
       View API Docs
     </a>
   </MoveTooltip>
   ```

**Pros**:
- Contextual help
- Educational value
- Shows API structure

**Cons**:
- More complex implementation
- Requires updating multiple components

---

## Recommended Implementation Plan

**Phase 2A: Basic Integration** (Quick Win)
1. Add `/docs/api` route with iframe embedding (Option 1)
2. Add navigation link to main menu
3. Test on localhost and production

**Phase 2B: Enhanced Integration** (Polish)
1. Add API docs links to Pokédex pages (Option 3)
2. Add links to team builder tooltips
3. Create dedicated help/resources page with documentation links

---

## Theming & Customization

The documentation site can be themed to match your app's design. The app agent can:

1. **Access Documentation Source**: SSH to server and inspect files
   ```bash
   ssh moodmnky@10.3.0.119
   cd /home/moodmnky/POKE-MNKY/tools/pokeapi-docs
   ```

2. **Customize Styles**: Edit `src/global.scss` or component-specific SCSS files
   - Main styles: `src/global.scss`
   - Component styles: `src/components/*/*.module.scss`
   - Constants: `src/constants.scss`

3. **Update Branding**: Modify `src/components/Header/Header.js` and `src/components/Footer/Footer.js`

4. **Rebuild**: After changes, rebuild the Docker container
   ```bash
   cd /home/moodmnky/POKE-MNKY
   docker compose build pokeapi-docs
   docker compose up -d pokeapi-docs
   ```

**Key Files for Theming**:
- `src/App.js` - Main app component
- `src/global.scss` - Global styles
- `src/constants.scss` - Color/theme constants
- `src/components/Header/Header.js` - Header component
- `src/components/Footer/Footer.js` - Footer component

**Theme Variables** (in `src/constants.scss`):
- Colors, spacing, typography can be customized
- Match your Next.js app's design system

---

## Discord Bot Integration

**Status**: ✅ **Already Implemented**

The Discord bot now includes `/api-docs` command:
- **Command**: `/api-docs [endpoint:<name>]`
- **Description**: View PokéAPI documentation and reference
- **Autocomplete**: Supports endpoint names (pokemon, moves, abilities, etc.)
- **Response**: Links to documentation site with quick navigation

**No action needed** - The command is already added to the bot and will be available after restarting the Discord bot service.

---

## Testing Checklist

- [ ] Documentation site accessible at `https://pokeapi-docs.moodmnky.com`
- [ ] `/docs/api` route created in Next.js app
- [ ] Navigation link added to main menu
- [ ] Iframe loads correctly (if using Option 1)
- [ ] Links work correctly (if using Option 2/3)
- [ ] Mobile responsive (test on mobile device)
- [ ] Environment variables set correctly
- [ ] Discord bot `/api-docs` command works

---

## Environment Variables

**Next.js App** (`.env.local` for development, Vercel for production):
```
NEXT_PUBLIC_POKEAPI_DOCS_URL=https://pokeapi-docs.moodmnky.com
```

**Note**: For local development on a different machine, you can use:
```
NEXT_PUBLIC_POKEAPI_DOCS_URL=http://10.3.0.119:8090
```

---

## Server Access for Theming

If the app agent needs to customize the documentation site's theme:

**SSH Access**:
```bash
ssh moodmnky@10.3.0.119
# Password: MOODMNKY88
```

**Docker Access**:
```bash
# After SSH, access container
docker exec -it poke-mnky-pokeapi-docs /bin/sh

# Or rebuild after changes
cd /home/moodmnky/POKE-MNKY
docker compose build pokeapi-docs
docker compose up -d pokeapi-docs
```

**File Locations**:
- Source: `/home/moodmnky/POKE-MNKY/tools/pokeapi-docs/src/`
- Styles: `/home/moodmnky/POKE-MNKY/tools/pokeapi-docs/src/global.scss`
- Components: `/home/moodmnky/POKE-MNKY/tools/pokeapi-docs/src/components/`

---

## Questions or Issues?

If you encounter any issues during integration:
1. Check that the documentation site is running: `curl https://pokeapi-docs.moodmnky.com/health`
2. Verify environment variables are set correctly
3. Check browser console for iframe/CORS errors (if using Option 1)
4. Review server logs: `docker compose logs pokeapi-docs`

---

**Document Status**: Ready for App Agent Implementation  
**Last Updated**: January 15, 2026
