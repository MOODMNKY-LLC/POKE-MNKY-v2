# Master Data Sheet Structure

**Category**: Data Structures  
**Purpose**: Comprehensive documentation of the master data sheet organization and content

---

## Introduction

The Master Data Sheet is the central repository for core league data and configuration. It contains essential information about seasons, teams, Pokemon, and league settings. Understanding the master data sheet structure is crucial for understanding how league data is organized and accessed.

---

## Sheet Organization

### Core Data Sections

The master data sheet is organized into logical sections:

1. **League Configuration**: Season settings, rules, and parameters
2. **Team Data**: Team information, rosters, and assignments
3. **Pokemon Data**: Available Pokemon, point values, and metadata
4. **Season Information**: Current season details and timeline
5. **Reference Data**: Lookup tables and reference information

---

## Key Data Elements

### League Configuration

**Season Settings**:
- Current season identification
- Season start and end dates
- Draft dates and deadlines
- Battle week schedules
- Rule versions and amendments

**Budget Configuration**:
- Draft budget per team (120 points)
- Tera budget per team (15 points)
- Point value ranges (1-20)
- Budget validation rules

### Team Information

**Team Data**:
- Team names and identifiers
- Coach names and contact information
- Division and conference assignments
- Team creation dates
- Team status (active/inactive)

**Roster Data**:
- Pokemon assigned to teams
- Draft selections and order
- Point values spent
- Roster composition
- Tera Captain designations

### Pokemon Data

**Draft Pool**:
- Available Pokemon list
- Point value assignments
- Availability status
- Draft eligibility
- Banned Pokemon list

**Pokemon Metadata**:
- Type information
- Base stats
- Abilities
- Move pools
- Competitive viability

---

## Data Relationships

### Master Data Connections

The master data sheet connects to:

**Draft Board**:
- Provides Pokemon availability
- Supplies point values
- Tracks draft progress
- Updates availability status

**Teams Pages**:
- Receives team assignments
- Provides roster data
- Tracks team composition
- Updates team statistics

**Data Sheet**:
- Receives raw data
- Performs calculations
- Generates derived metrics
- Creates standings and rankings

**Pokedex**:
- Provides Pokemon reference data
- Supplies type information
- Offers stat references
- Contains ability and move data

---

## Database Mapping

### Schema Relationships

The master data sheet maps to database tables:

**League Configuration**:
- `league_config` table
- `seasons` table
- `draft_budgets` table

**Team Data**:
- `teams` table
- `team_rosters` table
- `coaches` or `users` table

**Pokemon Data**:
- `draft_pool` table
- `pokemon` table
- `pokepedia_pokemon` table

**Season Data**:
- `seasons` table
- `matches` table
- `standings` views

---

## Data Integrity

### Validation Rules

The master data sheet enforces:
- **Budget Constraints**: Teams cannot exceed point budgets
- **Roster Limits**: Teams must maintain 8-10 Pokemon
- **Draft Rules**: Pokemon can only be drafted once
- **Season Alignment**: Data must align with current season

### Data Consistency

Consistency maintained through:
- **Single Source of Truth**: Master data sheet as primary source
- **Synchronization**: Regular sync between sheets and database
- **Validation**: Automated checks for data integrity
- **Reconciliation**: Processes to resolve discrepancies

---

## Access Patterns

### Read Operations

Common read patterns:
- **Team Lookups**: Finding team information by name or ID
- **Pokemon Queries**: Searching available Pokemon by criteria
- **Season Data**: Retrieving current season configuration
- **Reference Data**: Looking up type, stat, or ability information

### Write Operations

Common write patterns:
- **Draft Updates**: Recording draft selections
- **Roster Changes**: Updating team compositions
- **Season Progression**: Advancing season state
- **Configuration Updates**: Modifying league settings

---

## Related Information

- **Draft Board**: See `../draft-system/01-draft-board-structure.md`
- **Teams**: See `../teams/01-team-structure.md`
- **Data Sheet**: See `../data-structures/02-data-sheet.md`
- **App Integration**: See `../app-integration/` for API access

---

**Last Updated**: January 18, 2026  
**Status**: Active - Season 5  
**Source**: Google Sheets - Master Data Sheet
