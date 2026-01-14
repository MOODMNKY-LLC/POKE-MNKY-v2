# Pokemon Showdown Team Format - Comprehensive Research

**Date**: January 15, 2026  
**Research Focus**: Team file format structure, parsing libraries, and prettification tools

---

## Format Structure Analysis

### Standard Team File Format

Pokemon Showdown team files follow this structure:

```
=== [genX] Folder/Subfolder/Team Name ===

Pokemon1 (Nickname) (Gender) @ Item
Level: XX
Ability: Ability Name
Shiny: Yes/No
Happiness: XXX
EVs: XXX HP / XXX Atk / XXX Def / XXX SpA / XXX SpD / XXX Spe
IVs: XXX HP / XXX Atk / XXX Def / XXX SpA / XXX SpD / XXX Spe
Nature Nature
- Move 1
- Move 2
- Move 3
- Move 4

Pokemon2 @ Item
Ability: Ability Name
EVs: XXX HP / XXX Atk / XXX Def / XXX SpA / XXX SpD / XXX Spe
Nature Nature
- Move 1
- Move 2
- Move 3
- Move 4

[... additional Pokemon ...]
```

### Header Format Specification

**Pattern**: `=== [genX] Folder/Team Name ===`

**Components**:
- `===` - Header delimiter (required)
- `[genX]` - Generation identifier (e.g., `[gen9]`, `[gen8]`)
- `Folder/Team Name` - Optional folder path and team name
- `===` - Closing delimiter (required)

**Examples**:
- `=== [gen9] My Team ===` - Simple format
- `=== [gen9] OU/Offensive Team ===` - With folder
- `=== [gen9] Folder 1/Subfolder/Team Name ===` - Nested folders

**Metadata Extracted**:
- Generation number (from `[genX]`)
- Format/tier (if included, e.g., `[gen9ou]`)
- Folder path (if present)
- Team name (last segment after `/`)

---

## Parsing Library Comparison

### 1. Koffing (Currently Installed)

**Package**: `koffing` v1.0.0  
**Status**: ✅ Installed  
**Language**: JavaScript/TypeScript  
**Gen Support**: Up to Gen 9

**Features**:
- ✅ Parses Showdown team exports
- ✅ Converts to JSON format
- ✅ Converts JSON back to Showdown format
- ✅ Sanitizes invalid data
- ✅ Prettifies team exports
- ✅ Handles header format (`=== [genX] ... ===`)
- ✅ Supports PokemonTeamSet (multiple teams in one file)

**API**:
```typescript
import { Koffing } from 'koffing';

// Parse team (handles headers automatically)
const parsed = Koffing.parse(teamText);
// Returns: PokemonTeamSet or PokemonTeam

// Prettify team
const prettified = parsed.toShowdown();
// or
const formatted = Koffing.format(teamText);
```

**Header Handling**:
- Automatically parses headers
- Extracts generation, folder, team name
- Preserves metadata in parsed object

**Strengths**:
- Already installed
- Good TypeScript support
- Handles edge cases well
- Active maintenance

**Limitations**:
- Header metadata not easily accessible in parsed object
- May need manual header parsing for metadata extraction

---

### 2. @pkmn/sets

**Package**: `@pkmn/sets`  
**Status**: ❌ Not installed  
**Language**: JavaScript/TypeScript  
**Gen Support**: All generations

**Features**:
- ✅ Parses Showdown sets and teams
- ✅ Handles packed format
- ✅ Handles JSON format
- ✅ Handles text format
- ✅ Header metadata extraction
- ✅ Folder structure parsing
- ✅ Format validation

**API**:
```typescript
import { Sets } from '@pkmn/sets';

// Import team (parses header)
const team = Sets.importTeam(teamText);
// Returns: Team object with name, folder, format properties

// Export team
const exported = Sets.exportTeam(team);
```

**Header Handling**:
- Explicitly extracts header metadata
- Provides `team.name`, `team.folder`, `team.format`
- Better metadata access than koffing

**Strengths**:
- Better metadata handling
- Part of @pkmn ecosystem (works with @pkmn/dex, @pkmn/sim)
- More explicit API for metadata

**Limitations**:
- Not currently installed
- May have different API than koffing
- Need to verify compatibility

---

### 3. Other Libraries

**pokemon-formats** (Python):
- Python-only, not applicable

**poke-env** (Python):
- Python-only, not applicable

**Recommendation**: Use **koffing** (already installed) with manual header parsing for metadata extraction, or add **@pkmn/sets** for better metadata handling.

---

## Prettification Capabilities

### Koffing Prettification

**Features**:
- Adds proper indentation
- Sorts Pokemon entries
- Formats EVs/IVs consistently
- Preserves header format
- Cleans up invalid data

**Usage**:
```typescript
const prettified = parsed.toShowdown();
// or
const formatted = Koffing.format(teamText);
```

**Options**: Limited customization options, but produces clean, consistent output.

---

## Implementation Recommendations

### 1. Enhanced Team Parser

**Improvements Needed**:
- Extract header metadata (generation, folder, team name)
- Preserve header during parsing
- Handle multiple teams in one file (PokemonTeamSet)
- Better error messages for format issues

### 2. Team Upload/Export

**Upload Features**:
- Accept `.txt` files with Showdown format
- Parse header metadata
- Extract team name and folder
- Validate format before processing

**Export Features**:
- Export teams in Showdown format
- Include header with generation and team name
- Prettify output
- Support folder organization

### 3. Validation Improvements

**Format-Specific Validations**:
- Validate header format
- Check generation compatibility
- Verify folder structure
- Validate team name format

---

## Next Steps

1. **Enhance team-parser.ts** to extract header metadata
2. **Add @pkmn/sets** for better metadata handling (optional)
3. **Create team upload component** for file uploads
4. **Create team export functionality** with proper formatting
5. **Improve validation** to check header format

---

**Research Complete - Ready for Implementation**
