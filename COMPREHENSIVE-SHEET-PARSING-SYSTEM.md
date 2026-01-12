# Comprehensive Google Sheets Parsing System

## Overview

This document describes the comprehensive parsing system designed to handle multiple types of structured data in Google Sheets, including master data sheets, draft tables, team pages, standings, and more.

## Architecture

### Parser Factory Pattern

The system uses a **Factory Pattern** to create appropriate parsers based on sheet type and configuration:

```
ParserFactory
  ├── TeamsParser (standings, rankings)
  ├── DraftParser (draft results, rosters)
  ├── MatchesParser (match results, battles)
  ├── MasterDataParser (master/reference data)
  ├── TeamPageParser (individual team sheets)
  └── GenericParser (fallback for unknown types)
```

### Key Components

1. **Analysis Endpoint** (`/api/admin/google-sheets/analyze`)
   - Comprehensively analyzes all sheets in a spreadsheet
   - Identifies sheet types, data structures, and patterns
   - Suggests parsing configurations for each sheet

2. **Parser Factory** (`lib/google-sheets-parsers/index.ts`)
   - Creates appropriate parser instances based on configuration
   - Handles parser selection logic

3. **Base Parser** (`lib/google-sheets-parsers/base-parser.ts`)
   - Abstract base class with common functionality
   - Header loading, raw data access, column mapping utilities

4. **Specific Parsers**
   - Each parser type extends `BaseParser`
   - Implements type-specific parsing logic
   - Can use AI parsing when needed

## Sheet Type Detection

### Automatic Detection

The analysis endpoint automatically detects sheet types based on:

1. **Sheet Name Patterns**
   - "Standings", "Ranking", "Leaderboard" → `teams`
   - "Draft", "Roster", "Picks" → `draft`
   - "Match", "Battle", "Week" → `matches`
   - "Master", "Data", "Reference" → `master_data`
   - "Team" (in name) → `team_page`

2. **Header Analysis**
   - Column names suggest data type
   - Presence of specific fields (e.g., "Team Name", "Round", "Week")

3. **Data Structure**
   - Row patterns
   - Data types in columns
   - Complexity assessment

### Manual Configuration

Users can also manually configure parsing:
- Select parser type
- Map columns to database fields
- Enable/disable AI parsing
- Set special handling flags

## Parser Types

### 1. Teams Parser (`TeamsParser`)

**Use Cases:**
- Standings sheets
- Team rankings
- Leaderboards

**Features:**
- ✅ AI-powered parsing for unstructured data
- ✅ Geographic inference for divisions/conferences
- ✅ Manual parsing with column mapping
- ✅ Handles sheets with/without headers

**Configuration:**
```typescript
{
  parser_type: "teams",
  table_name: "teams",
  use_ai: true, // Auto-detected based on structure
  column_mapping: {
    "Team Name": "name",
    "Coach": "coach_name",
    "Wins": "wins",
    // ...
  },
  special_handling: ["no_headers"] // if needed
}
```

### 2. Draft Parser (`DraftParser`)

**Use Cases:**
- Draft results
- Team rosters
- Pick orders

**Features:**
- Structured data parsing
- Round/order tracking
- Pokemon/team associations

**Configuration:**
```typescript
{
  parser_type: "draft",
  table_name: "team_rosters",
  use_ai: false, // Usually structured
  column_mapping: {
    "Team": "team_id",
    "Pokemon": "pokemon_id",
    "Round": "draft_round",
    // ...
  }
}
```

### 3. Matches Parser (`MatchesParser`)

**Use Cases:**
- Match results
- Battle outcomes
- Weekly stats

**Features:**
- Score parsing
- Winner determination
- Week tracking

**Configuration:**
```typescript
{
  parser_type: "matches",
  table_name: "matches",
  use_ai: true, // For unstructured formats
  column_mapping: {
    "Week": "week",
    "Team 1": "team1_name",
    "Team 2": "team2_name",
    // ...
  }
}
```

### 4. Master Data Parser (`MasterDataParser`)

**Use Cases:**
- Master data sheets
- Reference tables
- Multi-table sheets

**Features:**
- AI-powered multi-table extraction
- Complex structure handling
- Multiple data type support

**Configuration:**
```typescript
{
  parser_type: "master_data",
  table_name: "various", // May extract to multiple tables
  use_ai: true, // Required for complex structures
  special_handling: ["multi_table_extraction"]
}
```

### 5. Team Page Parser (`TeamPageParser`)

**Use Cases:**
- Individual team sheets
- Team-specific data
- Custom team formats

**Features:**
- Team name extraction from sheet name
- Variable structure handling
- AI-powered parsing

**Configuration:**
```typescript
{
  parser_type: "team_page",
  table_name: "teams", // or team_rosters, etc.
  use_ai: true, // Team pages vary widely
  special_handling: ["extract_team_name_from_sheet"]
}
```

### 6. Generic Parser (`GenericParser`)

**Use Cases:**
- Unknown sheet types
- Fallback option
- Custom data extraction

**Features:**
- Flexible column mapping
- AI fallback when needed
- Basic data extraction

## Usage Workflow

### Step 1: Analyze Spreadsheet

```typescript
// POST /api/admin/google-sheets/analyze
const response = await fetch('/api/admin/google-sheets/analyze', {
  method: 'POST',
  body: JSON.stringify({ spreadsheet_id: '...' })
})

const analysis = await response.json()
// Returns comprehensive analysis of all sheets
```

### Step 2: Review Analysis

The analysis includes:
- Sheet structure details
- Data samples
- Suggested parsing configurations
- Complexity assessment

### Step 3: Configure Parsing

For each sheet, configure:
- Parser type
- Table mapping
- Column mapping
- AI usage
- Special handling

### Step 4: Sync Data

```typescript
// The sync system uses parser factory to create appropriate parsers
const parser = ParserFactory.createParser(config, sheet, supabase)
const result = await parser.parse()
```

## AI Integration

### When AI is Used

AI parsing is automatically used when:
1. Sheet has no headers (`no_headers` flag)
2. Headers are invalid (e.g., "Week 14" instead of column names)
3. Structure is too complex for manual parsing
4. `use_ai: true` is explicitly set

### AI Parsers

- **Teams**: `parseTeamDataWithAI` - Infers divisions, conferences, etc.
- **Matches**: `parseMatchDataWithAI` - Parses scores, determines winners
- **Master Data**: Multi-table extraction (to be implemented)
- **Team Pages**: Variable structure parsing (to be implemented)

## Special Handling Flags

- `no_headers`: Sheet has no header row
- `single_column`: Data is in a single column
- `multi_table_extraction`: Extract multiple tables from one sheet
- `extract_team_name_from_sheet`: Extract team name from sheet name/header

## Database Schema Mapping

### Teams Table
- `name` (required)
- `coach_name` (required)
- `division` (required)
- `conference` (required)
- `wins`, `losses`, `differential`, `strength_of_schedule`

### Matches Table
- `week` (required)
- `team1_name`, `team2_name` (required)
- `team1_score`, `team2_score`
- `winner_name`
- `differential`
- `status`

### Team Rosters Table
- `team_id` (required)
- `pokemon_id` (required)
- `draft_round`, `draft_order`, `draft_points`

## Implementation Status

### ✅ Completed
- Base parser architecture
- Parser factory
- Teams parser (with AI support)
- Analysis endpoint
- Sheet type detection

### 🚧 In Progress
- Draft parser implementation
- Matches parser implementation
- Master data parser implementation

### 📋 Planned
- Team page parser implementation
- Generic parser implementation
- Multi-table extraction
- Image/comment extraction
- Validation and error recovery

## Next Steps

1. **Run Analysis**: Use `/api/admin/google-sheets/analyze` to analyze your spreadsheet
2. **Review Results**: Check suggested configurations for each sheet
3. **Configure Parsers**: Set up parsing configurations in admin panel
4. **Test Sync**: Run sync and verify data extraction
5. **Iterate**: Adjust configurations based on results

## Example: Analyzing a Spreadsheet

```bash
# 1. Analyze spreadsheet
curl -X POST http://localhost:3000/api/admin/google-sheets/analyze \
  -H "Content-Type: application/json" \
  -d '{"spreadsheet_id": "YOUR_SHEET_ID"}'

# Response includes:
# - All sheets with structure analysis
# - Suggested parser types
# - Column mapping suggestions
# - Data samples
```

## Benefits

1. **Flexibility**: Handles multiple sheet types and structures
2. **Intelligence**: AI-powered parsing for unstructured data
3. **Extensibility**: Easy to add new parser types
4. **Maintainability**: Clear separation of concerns
5. **User-Friendly**: Automatic detection and suggestions

## Future Enhancements

1. **Visual Mapper**: UI for mapping columns visually
2. **Template System**: Save and reuse parsing configurations
3. **Validation Rules**: Custom validation per parser type
4. **Incremental Sync**: Only sync changed rows
5. **Conflict Resolution**: Handle data conflicts intelligently
