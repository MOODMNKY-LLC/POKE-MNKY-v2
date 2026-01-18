# Pokédex - Complete Reference Data

**Category**: Data Structures  
**Purpose**: Comprehensive documentation of Pokédex structure based on extracted Google Sheets data

---

## Introduction

The Pokédex sheet contains 1000 rows of Pokemon reference data, providing comprehensive information about all Pokemon available in the league. This documentation is based on actual extracted data, providing accurate representation of Pokemon data organization.

---

## Pokédex Overview

### Sheet Statistics

- **Total Rows**: 1000 rows of Pokemon data
- **Organization**: Comprehensive Pokemon reference
- **Purpose**: Complete Pokemon information database
- **Usage**: Reference for drafting, team building, and strategy

### Data Organization

Pokemon organized by:
- **Dex Number**: National Pokedex order
- **Name**: Pokemon species name
- **Type**: Primary and secondary types
- **Generation**: Generation of introduction
- **Availability**: Draft pool availability

---

## Pokemon Data Structure

### Core Information

Each Pokemon entry contains:
- **Name**: Species name
- **National Dex Number**: Pokedex number
- **Types**: Primary and secondary types
- **Base Stats**: HP, Attack, Defense, Special Attack, Special Defense, Speed
- **Abilities**: Available abilities
- **Move Pool**: Learnable moves

### Additional Data

May include:
- **Evolution Line**: Evolution relationships
- **Competitive Tier**: Usage tier (OU, UU, etc.)
- **Point Value**: Draft point cost
- **Availability**: Draft pool status

---

## Type Information

### Type Data

**Primary Type**: First type of Pokemon  
**Secondary Type**: Optional second type  
**Type Combinations**: All possible type pairings  
**Type Effectiveness**: Type matchup data

### Type Coverage Analysis

**Offensive Coverage**: Types Pokemon can hit effectively  
**Defensive Coverage**: Types Pokemon resists  
**Weakness Analysis**: Types Pokemon is weak to  
**Resistance Analysis**: Types Pokemon resists

---

## Stat Information

### Base Stats

**HP**: Hit Points base stat  
**Attack**: Physical attack base stat  
**Defense**: Physical defense base stat  
**Special Attack**: Special attack base stat  
**Special Defense**: Special defense base stat  
**Speed**: Speed base stat

### Stat Totals

**Base Stat Total**: Sum of all base stats  
**Stat Distribution**: How stats are distributed  
**Competitive Tiers**: Stat-based competitive categorization

---

## Database Integration

### Pokedex Tables

**pokepedia_pokemon**:
- Pokemon species data
- Type information
- Basic metadata
- Reference data

**pokemon_cache**:
- Cached Pokemon data
- Performance optimization
- Quick access data

**draft_pool**:
- Available Pokemon for drafting
- Point values
- Availability status

---

## Reference Usage

### Draft Planning

Coaches use Pokédex for:
- **Type Coverage**: Ensuring team type diversity
- **Stat Analysis**: Evaluating Pokemon strength
- **Ability Research**: Understanding abilities
- **Move Planning**: Planning movesets

### Battle Preparation

During battles:
- **Opponent Research**: Researching opponent Pokemon
- **Type Matchups**: Understanding type advantages
- **Move Coverage**: Planning move coverage
- **Ability Awareness**: Knowing opponent abilities

---

## Related Information

- **Master Data Sheet**: See `01-master-data-sheet.md` for core data
- **Data Sheet**: See `02-data-sheet-detailed.md` for calculations
- **Draft System**: See `../draft-system/` for draft information
- **MCP Integration**: See `../app-integration/03-mcp-server-integration.md` for API access

---

**Last Updated**: January 18, 2026  
**Status**: Active - Continuously Updated  
**Source**: Extracted Google Sheets Data - Pokédex Sheet (1000 rows)
