# Comprehensive Google Sheet Structure Analysis

## Spreadsheet Information
- **Spreadsheet ID**: `1wwH5XUHxQnivm90wGtNLQI_g7P3nPi5ZRcbZ3JU3-YQ`
- **URL**: https://docs.google.com/spreadsheets/d/1wwH5XUHxQnivm90wGtNLQI_g7P3nPi5ZRcbZ3JU3-YQ/edit

## Analysis Methodology

This document provides a comprehensive analysis of the five main sheet types identified in the Pokemon League Google Sheet:

1. **Master Data Sheet** - Reference data and lookup tables
2. **Rules Sheet** - League rules, draft board explanation, point system breakdown
3. **Draft Board** - Draft picks, rounds, team assignments
4. **Team Sheets** - Individual team pages with similar structure

Each analysis includes:
- Structure identification
- Data patterns
- Parsing complexity assessment
- Recommended parsing strategy
- Implementation considerations

---

## 1. Master Data Sheet Analysis

### Expected Structure
Master data sheets typically contain:
- **Pokemon Reference Data**: Complete Pokemon list with stats, types, abilities
- **Type Effectiveness Charts**: Type matchups and effectiveness multipliers
- **League Configuration**: Divisions, conferences, team assignments
- **Scoring Rules**: Point values for different battle outcomes
- **Season Settings**: Dates, weeks, playoff structure

### Parsing Challenges
1. **Multiple Related Tables**: Master data often contains several distinct tables within one sheet
2. **Reference Relationships**: Data references other sheets or tables
3. **Mixed Data Types**: Text, numbers, formulas, and potentially images
4. **Variable Structure**: Tables may have different column counts and row structures

### Recommended Parsing Strategy

**Parser Type**: `MasterDataParser` (multi-table extraction)

**Approach**:
1. **Section Detection**: Use AI to identify distinct table boundaries
2. **Table Extraction**: Extract each table as a separate entity
3. **Relationship Mapping**: Identify foreign key relationships between tables
4. **Data Normalization**: Transform extracted data into normalized database structure

**AI Parsing Requirements**:
- **High Priority**: Yes - Complex structure requires intelligent section detection
- **Model**: GPT-5.2 (STRATEGY_COACH) for complex reasoning
- **Schema**: Multi-table extraction schema with relationship detection

**Implementation**:
```typescript
// MasterDataParser should:
1. Detect table boundaries using formatting, blank rows, headers
2. Extract each table with its own schema
3. Identify relationships (e.g., Pokemon → Types → Effectiveness)
4. Map to multiple database tables:
   - pokemon_cache (if not already cached)
   - type_effectiveness
   - league_config
   - scoring_rules
```

**Special Handling**:
- `multi_table_extraction`: Extract multiple tables from one sheet
- `relationship_detection`: Identify foreign key relationships
- `normalization`: Transform denormalized data into normalized structure

---

## 2. Rules Sheet Analysis

### Expected Structure
Rules sheets typically contain:
- **League Rules**: General league rules and regulations
- **Draft Board Explanation**: How the draft board works, pick order, snake draft rules
- **Point System Breakdown**: Detailed scoring rules, point values, multipliers
- **Battle Format**: Rules for battles, team composition, substitutions
- **Playoff Structure**: Playoff format, seeding, bracket rules

### Parsing Challenges
1. **Text-Heavy Content**: Primarily prose text, not tabular data
2. **Hierarchical Structure**: Sections, subsections, nested rules
3. **Formatting Dependencies**: Bold headers, indentation, bullet points indicate structure
4. **Mixed Content**: May include tables, lists, and formatted text blocks
5. **Cross-References**: Rules may reference other sheets or sections

### Recommended Parsing Strategy

**Parser Type**: `RulesParser` (text extraction with structure detection)

**Approach**:
1. **Section Detection**: Identify major sections using formatting (bold headers, indentation)
2. **Hierarchy Extraction**: Extract hierarchical structure (sections → subsections → rules)
3. **Content Extraction**: Extract text content while preserving structure
4. **Table Detection**: Identify and extract any embedded tables
5. **Cross-Reference Resolution**: Link references to other sheets/sections

**AI Parsing Requirements**:
- **High Priority**: Yes - Text parsing requires natural language understanding
- **Model**: GPT-5.2 (STRATEGY_COACH) for complex text analysis
- **Schema**: Hierarchical document structure with sections and content

**Implementation**:
```typescript
// RulesParser should:
1. Detect sections using formatting patterns:
   - Bold text = Section headers
   - Indentation = Subsections
   - Bullet points = Rule items
2. Extract structured content:
   - Section title
   - Section content (text blocks)
   - Subsections
   - Embedded tables
3. Map to database:
   - rules table: id, section, subsection, content, order
   - Or store as JSON document in a single field
```

**Special Handling**:
- `text_extraction`: Extract prose text while preserving meaning
- `section_detection`: Identify hierarchical structure
- `formatting_aware`: Use cell formatting to infer structure
- `table_extraction`: Extract embedded tables within text sections

**Key Sections to Extract**:
1. **Draft Board Rules**: How draft works, pick order, snake draft explanation
2. **Point System**: Detailed scoring breakdown, point values, multipliers
3. **Battle Format**: Team composition rules, substitution rules
4. **League Structure**: Divisions, conferences, playoff format

---

## 3. Draft Board Analysis

### Expected Structure
Draft boards typically contain:
- **Round Structure**: Columns or rows representing draft rounds
- **Team Columns**: Each team has a column for their picks
- **Pick Order**: Sequential pick numbers (1, 2, 3...)
- **Player/Pokemon Names**: Drafted Pokemon names in cells
- **Pick Metadata**: Round number, pick number, team assignment
- **Draft Status**: Which picks are completed vs. pending

### Parsing Challenges
1. **Snake Draft Logic**: Pick order reverses each round (1-12, then 12-1)
2. **Team Identification**: Need to identify which column belongs to which team
3. **Pick Numbering**: Sequential numbering across rounds
4. **Empty Cells**: Pending picks are empty, completed picks have Pokemon names
5. **Visual Layout**: May use formatting, colors, borders for organization

### Recommended Parsing Strategy

**Parser Type**: `DraftParser` (structured grid parsing)

**Approach**:
1. **Grid Detection**: Identify draft grid structure (rounds × teams)
2. **Team Column Mapping**: Map columns to team names (from headers or first row)
3. **Round Detection**: Identify round structure (rows or columns)
4. **Pick Extraction**: Extract completed picks with metadata
5. **Order Calculation**: Calculate pick order based on snake draft logic

**AI Parsing Requirements**:
- **Low Priority**: No - Structured grid data doesn't need AI
- **Model**: N/A - Standard parsing sufficient
- **Schema**: Structured draft pick data

**Implementation**:
```typescript
// DraftParser should:
1. Detect grid structure:
   - Identify team columns (from headers or first row)
   - Identify round rows (from first column or row headers)
2. Extract picks:
   - For each cell with Pokemon name:
     - Team name (from column header)
     - Round number (from row)
     - Pick number (calculated: round * teams + position in round)
     - Pokemon name
3. Handle snake draft:
   - Odd rounds: pick order = 1, 2, 3, ..., 12
   - Even rounds: pick order = 12, 11, 10, ..., 1
4. Map to database:
   - team_rosters table: team_id, pokemon_id, draft_round, draft_order
```

**Special Handling**:
- `round_tracking`: Track draft rounds and pick order
- `pick_order`: Calculate sequential pick numbers
- `snake_draft_logic`: Handle reverse order in even rounds
- `team_column_mapping`: Map visual columns to team names

**Column Mapping**:
- `team_name` → Column header or first row
- `pokemon_name` → Cell value
- `draft_round` → Row number or row header
- `draft_order` → Calculated from round and position
- `draft_points` → Optional, if included in sheet

---

## 4. Team Sheets Analysis

### Expected Structure
Team sheets typically contain:
- **Team Header**: Team name, logo, coach name
- **Roster Section**: Current team roster with Pokemon names
- **Stats Section**: Team statistics (wins, losses, points)
- **Schedule Section**: Upcoming/past matches
- **Trade Section**: Pokemon available for trade
- **Images**: Team logo, banners, avatars embedded in cells

### Parsing Challenges
1. **Variable Structure**: Each team sheet may have slightly different layout
2. **Section Identification**: Need to identify different sections (roster, stats, trades)
3. **Team Name Extraction**: Extract team name from sheet name or header
4. **Image Extraction**: Extract embedded images (logos, banners, avatars)
5. **Mixed Data Types**: Text, numbers, images, formatted sections

### Recommended Parsing Strategy

**Parser Type**: `TeamPageParser` (section-based extraction)

**Approach**:
1. **Team Name Detection**: Extract from sheet name or header section
2. **Section Detection**: Identify sections (roster, stats, trades, schedule)
3. **Section-Specific Parsing**: Parse each section according to its type
4. **Image Extraction**: Extract images and associate with team
5. **Data Aggregation**: Combine data from all sections into team record

**AI Parsing Requirements**:
- **Medium Priority**: Yes - Variable structure benefits from AI
- **Model**: GPT-5.2 (STRATEGY_COACH) for structure detection
- **Schema**: Team data with nested sections

**Implementation**:
```typescript
// TeamPageParser should:
1. Extract team name:
   - From sheet name (e.g., "Team Name Roster")
   - From header cell (first few rows)
2. Detect sections:
   - Roster section: Table with Pokemon names
   - Stats section: Key-value pairs (Wins: 10, Losses: 2)
   - Trades section: Table with Pokemon available for trade
   - Schedule section: Table with match information
3. Parse each section:
   - Roster: Extract Pokemon names → team_rosters
   - Stats: Extract key-value pairs → teams table
   - Trades: Extract trade offers → trades table
   - Schedule: Extract matches → matches table
4. Extract images:
   - Logo: Usually in header section
   - Banner: Usually at top of sheet
   - Avatar: Usually small image in header
```

**Special Handling**:
- `extract_team_name_from_sheet`: Get team name from sheet name or header
- `variable_structure`: Handle different layouts across team sheets
- `section_detection`: Identify and parse different sections
- `image_extraction`: Extract and upload team images
- `multi_section_extraction`: Extract data from multiple sections

**Section Patterns**:
- **Roster**: Usually a table with Pokemon names, possibly with types/stats
- **Stats**: Key-value format (Wins: X, Losses: Y) or small table
- **Trades**: Table format with Pokemon names and trade details
- **Schedule**: Table with week, opponent, result columns

---

## 5. Parsing Strategy Integration

### Overall Workflow

1. **Sheet Detection**: Identify sheet type based on name and structure
2. **Parser Selection**: Select appropriate parser using ParserFactory
3. **Configuration**: Load parsing configuration from `sheet_mappings` table
4. **Execution**: Run parser with AI assistance if needed
5. **Data Transformation**: Transform extracted data to database schema
6. **Upsert**: Insert/update records in database
7. **Image Processing**: Extract and upload images to Supabase Storage
8. **Error Handling**: Log errors and continue with other sheets

### Parsing Order Dependencies

1. **Master Data** (First): Provides reference data for other sheets
2. **Rules** (Second): Provides configuration for validation
3. **Draft Board** (Third): Creates team rosters
4. **Team Sheets** (Fourth): Updates team-specific data

### Error Handling Strategy

- **Partial Success**: Continue parsing other sheets even if one fails
- **Error Logging**: Log detailed errors for each sheet
- **Validation**: Validate extracted data before database insertion
- **Rollback**: Consider transaction-based updates for data integrity

### Performance Considerations

- **Batch Processing**: Process multiple rows in batches
- **Caching**: Cache Pokemon data to avoid repeated API calls
- **Parallel Processing**: Process independent sheets in parallel
- **Rate Limiting**: Respect Google Sheets API rate limits

---

## Implementation Priority

### Phase 1: Core Parsers (High Priority)
1. ✅ **TeamsParser** - Already implemented
2. ⏳ **DraftParser** - Needs implementation
3. ⏳ **MasterDataParser** - Needs implementation

### Phase 2: Text Parsers (Medium Priority)
4. ⏳ **RulesParser** - Needs implementation
5. ⏳ **TeamPageParser** - Needs implementation

### Phase 3: Enhancements (Lower Priority)
6. ⏳ **GenericParser** - Fallback parser
7. ⏳ **Image Extraction** - Enhanced image handling
8. ⏳ **Comment Extraction** - Extract cell comments

---

## Next Steps

1. **Run Comprehensive Analysis**: Use `/api/admin/google-sheets/analyze` endpoint
2. **Review Analysis Results**: Examine detected sheet types and structures
3. **Implement Missing Parsers**: Build parsers for Draft, Master Data, Rules, Team Pages
4. **Test Parsing**: Test each parser with actual sheet data
5. **Refine Strategies**: Adjust parsing strategies based on results
6. **Document Patterns**: Document common patterns found in sheets

---

## Questions for Further Analysis

1. **Master Data Sheet**:
   - How many distinct tables are in the master data sheet?
   - What are the relationships between tables?
   - Are there any formulas or calculated fields?

2. **Rules Sheet**:
   - What is the exact structure of the draft board explanation?
   - How is the point system formatted (table, list, prose)?
   - Are there embedded tables or just text?

3. **Draft Board**:
   - Is it a grid format (rounds × teams)?
   - Are team names in headers or first row?
   - Is there metadata beyond Pokemon names?

4. **Team Sheets**:
   - How many team sheets are there?
   - Do they all follow the same structure?
   - Where are images located (header, specific cells)?

---

*This analysis will be updated after running the comprehensive analysis endpoint with actual sheet data.*
