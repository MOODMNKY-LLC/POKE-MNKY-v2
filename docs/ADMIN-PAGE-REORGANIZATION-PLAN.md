# Admin Page Reorganization Plan

**Date**: 2026-01-25  
**Status**: Implementation Ready

---

## Current State Analysis

### Structure Issues

1. **Draft-related items are fragmented** across 3 locations:
   - "Draft Sessions" card in Quick Actions grid
   - "Pokémon Draft Pool Management" card in Quick Actions grid  
   - `DraftPoolImport` component inline at bottom of page

2. **Backend sync functions are fragmented** across 4+ locations:
   - "Sync Google Sheets" card in Quick Actions grid
   - `PokemonSyncControl` component inline at bottom
   - `ShowdownPokedexSync` component inline at bottom
   - `DraftPoolImport` component (has sync functionality) inline at bottom

3. **No visual grouping** - everything is in a flat grid with no sections

4. **Inline components disconnected** - sync components at bottom feel separate from main navigation

5. **Dual-purpose items** - `DraftPoolImport` serves both draft management AND sync functions

---

## Proposed Organization

### Section 1: League Overview
- Stats cards (teams, matches, pokemon, last sync) - **Keep at top**
- League Management card - **Keep** (links to consolidated `/admin/league`)

### Section 2: Draft Management (NEW SECTION)
**Purpose**: Group all draft-related functionality together

**Items**:
- **Draft Sessions** - Create and manage draft sessions
- **Draft Pool Management** - Manage Pokémon availability and tiers
- **Draft Pool Import & Sync** - Import from JSON and sync to production (component)

**Visual**: Use a `Card` wrapper with section title and description, containing the 3 items

### Section 3: Data Synchronization (NEW SECTION)
**Purpose**: Group all backend sync functions together

**Items**:
- **Google Sheets Sync** - Sync master data from Google Sheets
- **Pokemon Data Sync** - Sync Pokemon data from PokeAPI (component)
- **Showdown Pokedex Sync** - Sync competitive database from Showdown (component)

**Visual**: Use a `Card` wrapper with section title and description, containing all sync controls

### Section 4: System Management
**Purpose**: Platform and configuration management

**Items**:
- **User Management** - Roles and permissions
- **Discord Management** - Bot, roles, webhooks
- **Poképedia Dashboard** - Supabase management
- **Playoff Bracket** - Playoff management

---

## Implementation Plan

### Phase 1: Create Section Components
1. Create `DraftManagementSection` component
   - Wraps draft-related cards/components
   - Includes section header with description
   - Uses consistent card styling

2. Create `DataSyncSection` component
   - Wraps all sync-related cards/components
   - Includes section header with description
   - Groups sync controls logically

### Phase 2: Reorganize Admin Page
1. Keep stats overview at top
2. Keep League Management card in main grid
3. Add Draft Management section (replaces scattered draft cards)
4. Add Data Synchronization section (replaces scattered sync cards/components)
5. Keep System Management items in main grid

### Phase 3: Visual Improvements
1. Add section dividers/headers for clarity
2. Use consistent spacing between sections
3. Ensure mobile responsiveness
4. Add icons to section headers

---

## Benefits

1. **Better Organization**: Related functionality grouped logically
2. **Easier Navigation**: Clear sections make finding features faster
3. **Reduced Clutter**: Inline components moved into organized sections
4. **Improved UX**: Visual hierarchy guides users to relevant features
5. **Maintainability**: Easier to add new draft/sync features in future

---

## Component Structure

```
AdminPage
├── Stats Overview (4 cards)
├── Quick Actions Grid
│   ├── League Management
│   └── System Management (4 cards)
├── Draft Management Section (NEW)
│   ├── Draft Sessions Card
│   ├── Draft Pool Management Card
│   └── DraftPoolImport Component
└── Data Synchronization Section (NEW)
    ├── Google Sheets Sync Card
    ├── PokemonSyncControl Component
    └── ShowdownPokedexSync Component
```
