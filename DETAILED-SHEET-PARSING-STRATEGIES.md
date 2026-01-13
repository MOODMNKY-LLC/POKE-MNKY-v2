# Detailed Sheet Parsing Strategies - Comprehensive Analysis

## Executive Summary

This document provides a comprehensive, deep-thinking analysis of the five main sheet types in the Pokemon League Google Sheet (`1wwH5XUHxQnivm90wGtNLQI_g7P3nPi5ZRcbZ3JU3-YQ`). Each sheet type requires a distinct parsing approach based on its structure, data patterns, and complexity.

---

## 1. Master Data Sheet - Deep Analysis

### Structure Characteristics

Master data sheets serve as the foundational reference layer for the entire league system. These sheets typically contain multiple related but distinct data tables that provide lookup values, configuration settings, and reference information for other sheets to consume.

**Expected Content Types:**

1. **Pokemon Reference Data**
   - Complete Pokemon list with Pokedex numbers
   - Type assignments (Type 1, Type 2)
   - Base stats (HP, Attack, Defense, Special Attack, Special Defense, Speed)
   - Abilities and move pools
   - Evolution chains and forms

2. **Type Effectiveness Matrix**
   - Type matchup tables showing effectiveness multipliers
   - Defensive and offensive type interactions
   - Special cases (immunities, double effectiveness)

3. **League Configuration Tables**
   - Division assignments (e.g., East, West, Central)
   - Conference structures
   - Team-to-division mappings
   - Season settings (start date, end date, playoff dates)

4. **Scoring Rules Reference**
   - Point values for different battle outcomes
   - Scoring multipliers
   - Special scoring rules

5. **Season Structure**
   - Week numbers and dates
   - Playoff bracket structure
   - Bye weeks and special events

### Parsing Complexity Assessment

**Complexity Level: HIGH**

The master data sheet presents several parsing challenges that make it one of the most complex sheet types to process:

1. **Multi-Table Structure**: Unlike other sheets that contain a single table, master data sheets often contain multiple distinct tables within the same sheet. These tables may be separated by blank rows, have different column structures, or use formatting to distinguish sections.

2. **Variable Table Boundaries**: Tables within the sheet may not have consistent boundaries. Some tables may span multiple rows with varying column counts, while others may be compact single-column lists.

3. **Reference Relationships**: Tables within master data sheets often reference each other. For example, a Pokemon table may reference type effectiveness data, which requires understanding these relationships during parsing.

4. **Mixed Data Types**: Master data sheets combine structured tabular data with potentially unstructured text, formulas, and embedded images or charts.

5. **Denormalized Data**: Master data may be stored in a denormalized format (e.g., Pokemon with all stats in one row) that needs to be normalized into separate database tables.

### Recommended Parsing Strategy

**Parser Type**: `MasterDataParser` with multi-table extraction capabilities

**Core Approach**: Section-based table detection and extraction

**Step-by-Step Process**:

1. **Sheet Structure Analysis**
   - Load entire sheet or large sample (first 500 rows)
   - Analyze cell formatting to identify section boundaries
   - Detect blank rows that separate tables
   - Identify header patterns (bold text, colored backgrounds)

2. **Table Boundary Detection**
   - Use AI to identify distinct table regions
   - Detect headers for each table (first non-empty row in a section)
   - Identify data rows vs. header rows vs. separator rows
   - Map table boundaries (start row, end row, start column, end column)

3. **Table Type Classification**
   - Classify each detected table:
     - Pokemon reference table
     - Type effectiveness matrix
     - League configuration
     - Scoring rules
     - Season structure
   - Use table headers and sample data to determine type

4. **Data Extraction Per Table**
   - Extract each table independently
   - Apply table-specific parsing logic
   - Handle missing values and data inconsistencies
   - Validate data types per column

5. **Relationship Mapping**
   - Identify foreign key relationships between tables
   - Map Pokemon → Types → Effectiveness relationships
   - Map Teams → Divisions → Conferences relationships

6. **Data Normalization**
   - Transform denormalized data into normalized structure
   - Split combined fields (e.g., "Fire/Water" → Type1: Fire, Type2: Water)
   - Create proper foreign key relationships

**AI Parsing Requirements**:

- **Model**: GPT-5.2 (STRATEGY_COACH) - Required for complex structure detection
- **Schema**: Multi-table extraction schema with relationship detection
- **Confidence Threshold**: 0.7+ for table boundary detection

**Implementation Code Structure**:

\`\`\`typescript
class MasterDataParser extends BaseParser {
  async parse(): Promise<ParseResult> {
    // 1. Detect all tables in sheet
    const tables = await this.detectTables()
    
    // 2. Classify each table
    const classifiedTables = await Promise.all(
      tables.map(table => this.classifyTable(table))
    )
    
    // 3. Extract data from each table
    const extractedData = await Promise.all(
      classifiedTables.map(table => this.extractTableData(table))
    )
    
    // 4. Map to database tables
    return this.mapToDatabase(extractedData)
  }
  
  private async detectTables(): Promise<Table[]> {
    // Use AI to detect table boundaries
    const prompt = `Analyze this Google Sheet and identify all distinct tables.
    Tables are separated by blank rows or formatting changes.
    For each table, provide: start_row, end_row, start_column, end_column, headers`
    
    return await parseWithAI(this.sheet, prompt, MultiTableSchema)
  }
}
\`\`\`

**Database Mapping**:

- Pokemon data → `pokemon_cache` table (if not already cached)
- Type effectiveness → `type_effectiveness` table
- League config → `league_config` table
- Scoring rules → `scoring_rules` table
- Season structure → `season_weeks` table

**Special Handling Flags**:
- `multi_table_extraction`: Extract multiple tables from one sheet
- `relationship_detection`: Identify foreign key relationships
- `normalization`: Transform denormalized data
- `ai_required`: Always use AI for structure detection

---

## 2. Rules Sheet - Deep Analysis

### Structure Characteristics

The rules sheet is fundamentally different from other sheet types because it contains primarily prose text rather than tabular data. This sheet serves as the league's rulebook, containing explanations, regulations, and procedural information that must be parsed while preserving meaning and structure.

**Expected Content Sections**:

1. **League Overview**
   - League name and description
   - Season information
   - General league rules

2. **Draft Board Explanation** (Critical Section)
   - How the draft board works
   - Pick order explanation (snake draft logic)
   - Draft timing and procedures
   - Keeper rules and draft restrictions

3. **Point System Breakdown** (Critical Section)
   - Detailed scoring rules
   - Point values for wins, losses, ties
   - Bonus point systems
   - Playoff point multipliers
   - Head-to-head vs. points-based scoring

4. **Battle Format Rules**
   - Team composition requirements
   - Pokemon selection rules
   - Substitution rules
   - Battle timing and scheduling

5. **Playoff Structure**
   - Playoff format explanation
   - Seeding rules
   - Bracket structure
   - Championship rules

### Parsing Complexity Assessment

**Complexity Level: HIGH**

Rules sheets present unique parsing challenges:

1. **Text-Heavy Content**: Unlike other sheets with structured data, rules sheets contain primarily prose text that requires natural language understanding to parse effectively.

2. **Hierarchical Structure**: Rules are organized hierarchically with sections, subsections, and nested rules. This hierarchy must be preserved during parsing.

3. **Formatting Dependencies**: The structure is often indicated by formatting rather than explicit markers:
   - Bold text typically indicates section headers
   - Indentation indicates subsections
   - Bullet points indicate rule items
   - Numbered lists indicate sequential procedures

4. **Mixed Content Types**: Rules sheets may contain:
   - Prose paragraphs
   - Bulleted lists
   - Numbered lists
   - Embedded tables (e.g., point value tables)
   - Formulas or calculations

5. **Cross-References**: Rules may reference other sheets, sections, or external resources that need to be resolved.

6. **Context Preservation**: Unlike tabular data where each cell is independent, rules text requires context preservation to maintain meaning.

### Recommended Parsing Strategy

**Parser Type**: `RulesParser` with hierarchical text extraction

**Core Approach**: Format-aware section detection with AI-powered content extraction

**Step-by-Step Process**:

1. **Format Analysis**
   - Analyze cell formatting (bold, italic, background colors)
   - Detect indentation patterns
   - Identify list markers (bullets, numbers)
   - Map formatting to structure hierarchy

2. **Section Detection**
   - Identify major sections using formatting patterns:
     - Bold text in first column = Section headers
     - Indented cells = Subsections
     - Bullet points = Rule items
   - Create hierarchical structure tree

3. **Content Extraction**
   - Extract text content while preserving structure
   - Maintain section hierarchy
   - Extract embedded tables separately
   - Preserve formatting markers for context

4. **Section Classification**
   - Classify sections by content:
     - Draft Board Explanation
     - Point System Breakdown
     - Battle Format Rules
     - Playoff Structure
   - Use AI to understand section meaning

5. **Structured Data Extraction**
   - Extract point values from tables
   - Extract draft order logic from explanations
   - Extract rule items from lists
   - Create structured representation

**AI Parsing Requirements**:

- **Model**: GPT-5.2 (STRATEGY_COACH) - Required for natural language understanding
- **Schema**: Hierarchical document structure with sections and content
- **Confidence Threshold**: 0.8+ for section classification

**Implementation Code Structure**:

\`\`\`typescript
class RulesParser extends BaseParser {
  async parse(): Promise<ParseResult> {
    // 1. Analyze formatting to detect structure
    const structure = await this.analyzeFormatting()
    
    // 2. Extract sections hierarchically
    const sections = await this.extractSections(structure)
    
    // 3. Classify sections by content
    const classifiedSections = await Promise.all(
      sections.map(section => this.classifySection(section))
    )
    
    // 4. Extract structured data from sections
    const structuredData = await this.extractStructuredData(classifiedSections)
    
    // 5. Map to database
    return this.mapToDatabase(structuredData)
  }
  
  private async extractSections(structure: FormattingStructure): Promise<Section[]> {
    const prompt = `Extract all sections from this rules document.
    Preserve hierarchy: sections → subsections → rules.
    Identify: Draft Board Explanation, Point System Breakdown, Battle Format, Playoff Structure.
    Extract any embedded tables with point values or draft order logic.`
    
    return await parseWithAI(this.sheet, prompt, RulesDocumentSchema)
  }
}
\`\`\`

**Database Mapping Options**:

**Option 1: Structured Rules Table**
- `rules` table: `id`, `section`, `subsection`, `content`, `order`, `rule_type`
- Stores hierarchical structure in database

**Option 2: JSON Document Storage**
- Single `league_rules` table with JSONB field
- Stores entire rules document as structured JSON
- Easier to query and update

**Option 3: Hybrid Approach**
- Store prose content in JSONB
- Extract structured data (point values, draft logic) into separate tables
- Link structured data to prose sections

**Special Handling Flags**:
- `text_extraction`: Extract prose text while preserving meaning
- `section_detection`: Identify hierarchical structure
- `formatting_aware`: Use cell formatting to infer structure
- `table_extraction`: Extract embedded tables within text
- `ai_required`: Always use AI for content understanding

**Key Sections to Extract**:

1. **Draft Board Explanation**
   - How draft order works (snake draft explanation)
   - Pick timing and procedures
   - Keeper rules
   - Draft restrictions

2. **Point System Breakdown**
   - Win/loss/tie point values
   - Bonus point systems
   - Playoff multipliers
   - Scoring methodology

3. **Battle Format**
   - Team composition rules
   - Pokemon selection rules
   - Substitution procedures

4. **Playoff Structure**
   - Seeding rules
   - Bracket format
   - Championship rules

---

## 3. Draft Board - Deep Analysis

### Structure Characteristics

Draft boards are structured grid layouts that track draft picks across multiple rounds and teams. Understanding the grid structure and snake draft logic is critical for accurate parsing.

**Common Layout Patterns**:

1. **Grid Format (Most Common)**
   - Rounds as rows (vertical)
   - Teams as columns (horizontal)
   - Each cell contains a Pokemon name (when picked)
   - Empty cells indicate pending picks

2. **Alternative Format**
   - Teams as rows
   - Rounds as columns
   - Less common but possible

**Grid Structure Details**:

- **Header Row**: Contains team names (columns B, C, D, etc.)
- **Round Column**: Contains round numbers (column A, rows 2+)
- **Pick Cells**: Intersection of round and team contains Pokemon name
- **Visual Organization**: Often uses formatting (colors, borders) to organize

**Snake Draft Logic**:

Snake drafts reverse pick order each round:
- **Round 1**: Teams pick in order 1, 2, 3, ..., 12
- **Round 2**: Teams pick in reverse order 12, 11, 10, ..., 1
- **Round 3**: Teams pick in order 1, 2, 3, ..., 12 (same as Round 1)
- **Round 4**: Teams pick in reverse order 12, 11, 10, ..., 1 (same as Round 2)

**Pick Number Calculation**:
- Overall pick number = (round - 1) × teams + pick_in_round
- For snake draft, pick_in_round reverses in even rounds

### Parsing Complexity Assessment

**Complexity Level: MEDIUM**

Draft boards are more structured than rules sheets but have specific challenges:

1. **Grid Structure Detection**: Need to identify which dimension represents rounds vs. teams
2. **Team Column Mapping**: Map visual columns to actual team names
3. **Snake Draft Logic**: Calculate correct pick order accounting for reversals
4. **Empty Cell Handling**: Distinguish between "not yet picked" vs. "skipped pick"
5. **Metadata Extraction**: May need to extract additional data (draft points, timestamps)

### Recommended Parsing Strategy

**Parser Type**: `DraftParser` with grid structure detection

**Core Approach**: Grid analysis with snake draft logic calculation

**Step-by-Step Process**:

1. **Grid Structure Detection**
   - Identify if rounds are rows or columns
   - Identify if teams are columns or rows
   - Detect header row/column with team names
   - Detect round indicator column/row

2. **Team Column Mapping**
   - Extract team names from headers
   - Map column indices to team names
   - Handle team name variations

3. **Round Detection**
   - Identify round numbers from first column/row
   - Handle missing round indicators (infer from row/column position)

4. **Pick Extraction**
   - Iterate through grid cells
   - Extract Pokemon names from non-empty cells
   - Calculate pick metadata:
     - Round number
     - Team name
     - Pick number (with snake draft logic)
     - Overall pick number

5. **Snake Draft Logic Application**
   - Calculate pick order based on round parity
   - Odd rounds: normal order (1, 2, 3, ..., N)
   - Even rounds: reverse order (N, N-1, N-2, ..., 1)

**AI Parsing Requirements**:

- **Model**: Not required for standard grid format
- **Fallback**: Use AI if grid structure is unclear or non-standard
- **Schema**: Structured draft pick data

**Implementation Code Structure**:

\`\`\`typescript
class DraftParser extends BaseParser {
  async parse(): Promise<ParseResult> {
    // 1. Detect grid structure
    const gridStructure = await this.detectGridStructure()
    
    // 2. Map team columns
    const teamMapping = await this.mapTeamColumns(gridStructure)
    
    // 3. Extract picks with metadata
    const picks = await this.extractPicks(gridStructure, teamMapping)
    
    // 4. Apply snake draft logic
    const picksWithOrder = this.applySnakeDraftLogic(picks)
    
    // 5. Map to database
    return this.mapToDatabase(picksWithOrder)
  }
  
  private applySnakeDraftLogic(picks: DraftPick[]): DraftPick[] {
    const teams = this.getTeamCount()
    
    return picks.map((pick, index) => {
      const round = pick.round
      const isOddRound = round % 2 === 1
      
      // Calculate pick order within round
      let pickInRound: number
      if (isOddRound) {
        // Normal order: 1, 2, 3, ..., teams
        pickInRound = (pick.teamIndex % teams) + 1
      } else {
        // Reverse order: teams, teams-1, ..., 1
        pickInRound = teams - (pick.teamIndex % teams)
      }
      
      // Calculate overall pick number
      const overallPick = (round - 1) * teams + pickInRound
      
      return {
        ...pick,
        pickOrder: pickInRound,
        overallPick,
      }
    })
  }
}
\`\`\`

**Database Mapping**:

- Draft picks → `team_rosters` table
- Fields: `team_id`, `pokemon_id`, `draft_round`, `draft_order`, `overall_pick`, `draft_points` (optional)

**Special Handling Flags**:
- `round_tracking`: Track draft rounds and pick order
- `pick_order`: Calculate sequential pick numbers
- `snake_draft_logic`: Handle reverse order in even rounds
- `team_column_mapping`: Map visual columns to team names
- `grid_detection`: Detect grid structure (rows vs. columns)

**Column Mapping Patterns**:

Common header patterns to detect:
- `Team Name`, `Team`, `Manager`, `Owner`
- Round indicators: `Round 1`, `R1`, `1`, etc.
- Pokemon column: Usually the intersection of round row and team column

---

## 4. Team Sheets - Deep Analysis

### Structure Characteristics

Team sheets are individual pages dedicated to each team in the league. While they may share a similar overall structure, each team sheet can have variations in layout, section organization, and data presentation.

**Common Section Types**:

1. **Team Header Section**
   - Team name (prominent display)
   - Coach/manager name
   - Team logo (embedded image)
   - Team banner (embedded image)
   - Team avatar (small image)

2. **Roster Section**
   - Current team roster
   - Pokemon names (may include types, stats)
   - Roster positions or roles
   - Acquisition information (draft, trade, waiver)

3. **Statistics Section**
   - Team record (Wins, Losses, Ties)
   - Points scored/allowed
   - Point differential
   - Strength of schedule
   - Division/conference standings

4. **Schedule Section**
   - Upcoming matches
   - Past match results
   - Week-by-week breakdown
   - Playoff matchups (if applicable)

5. **Trade Section**
   - Pokemon available for trade
   - Trade offers received
   - Trade history
   - Trade preferences

6. **Additional Sections** (Variable)
   - Team notes or announcements
   - Strategy notes
   - Keeper decisions
   - Future draft plans

### Parsing Complexity Assessment

**Complexity Level: MEDIUM-HIGH**

Team sheets present challenges due to variability:

1. **Variable Structure**: Each team sheet may have different section layouts
2. **Section Identification**: Need to identify sections without consistent markers
3. **Team Name Extraction**: Extract team name from sheet name or header
4. **Image Extraction**: Extract and associate images with team
5. **Mixed Data Formats**: Different sections use different data formats (tables, key-value pairs, lists)

### Recommended Parsing Strategy

**Parser Type**: `TeamPageParser` with section-based extraction

**Core Approach**: Section detection with type-specific parsing

**Step-by-Step Process**:

1. **Team Name Extraction**
   - Extract from sheet name (e.g., "Team Name Roster" → "Team Name")
   - Extract from header cells (first few rows)
   - Use AI to identify team name if ambiguous

2. **Section Detection**
   - Identify section boundaries using:
     - Formatting changes (bold headers, background colors)
     - Blank rows
     - Section headers (e.g., "Roster", "Stats", "Trades")
   - Classify section types

3. **Section-Specific Parsing**
   - **Roster Section**: Parse as table → extract Pokemon names
   - **Stats Section**: Parse as key-value pairs → extract statistics
   - **Trades Section**: Parse as table → extract trade offers
   - **Schedule Section**: Parse as table → extract match information

4. **Image Extraction**
   - Extract embedded images from header section
   - Classify images (logo, banner, avatar) by position/size
   - Upload to Supabase Storage
   - Associate with team record

5. **Data Aggregation**
   - Combine data from all sections
   - Create unified team record
   - Link to related tables (rosters, matches, trades)

**AI Parsing Requirements**:

- **Model**: GPT-5.2 (STRATEGY_COACH) - Helpful for variable structure
- **Schema**: Team data with nested sections
- **Confidence Threshold**: 0.7+ for section detection

**Implementation Code Structure**:

\`\`\`typescript
class TeamPageParser extends BaseParser {
  async parse(): Promise<ParseResult> {
    // 1. Extract team name
    const teamName = await this.extractTeamName()
    
    // 2. Detect sections
    const sections = await this.detectSections()
    
    // 3. Parse each section
    const parsedSections = await Promise.all(
      sections.map(section => this.parseSection(section))
    )
    
    // 4. Extract images
    const images = await this.extractImages()
    
    // 5. Aggregate data
    const teamData = this.aggregateData(teamName, parsedSections, images)
    
    // 6. Map to database
    return this.mapToDatabase(teamData)
  }
  
  private async detectSections(): Promise<Section[]> {
    const prompt = `Identify all sections in this team sheet.
    Common sections: Roster, Statistics, Schedule, Trades.
    For each section, provide: section_type, start_row, end_row, headers, data_format`
    
    return await parseWithAI(this.sheet, prompt, TeamSheetSchema)
  }
}
\`\`\`

**Database Mapping**:

- Team info → `teams` table (name, coach, logo_url, banner_url, avatar_url)
- Roster → `team_rosters` table (team_id, pokemon_id, ...)
- Stats → `teams` table (wins, losses, points, ...)
- Trades → `trades` table (team_id, pokemon_id, ...)
- Schedule → `matches` table (team_id, opponent_id, week, ...)

**Special Handling Flags**:
- `extract_team_name_from_sheet`: Get team name from sheet name or header
- `variable_structure`: Handle different layouts across team sheets
- `section_detection`: Identify and parse different sections
- `image_extraction`: Extract and upload team images
- `multi_section_extraction`: Extract data from multiple sections
- `ai_helpful`: AI improves accuracy but not strictly required

**Section Parsing Patterns**:

1. **Roster Section**
   - Usually table format
   - Columns: Pokemon name, Type, Stats (optional)
   - Extract Pokemon names → link to `pokemon_cache`

2. **Stats Section**
   - Usually key-value format
   - Pattern: "Wins: 10", "Losses: 2"
   - Extract values → update `teams` table

3. **Trades Section**
   - Usually table format
   - Columns: Pokemon, Looking For, Status
   - Extract → create `trades` records

4. **Schedule Section**
   - Usually table format
   - Columns: Week, Opponent, Result, Score
   - Extract → create/update `matches` records

---

## 5. Parsing Strategy Integration

### Overall Workflow

The parsing system must coordinate multiple parsers to process the entire spreadsheet efficiently:

1. **Sheet Detection**: Identify sheet type based on name and structure
2. **Parser Selection**: Use ParserFactory to select appropriate parser
3. **Configuration Loading**: Load parsing config from `sheet_mappings` table
4. **Parser Execution**: Run parser with AI assistance if configured
5. **Data Transformation**: Transform extracted data to database schema
6. **Database Upsert**: Insert/update records with conflict resolution
7. **Image Processing**: Extract and upload images to Supabase Storage
8. **Error Handling**: Log errors and continue with other sheets

### Parsing Order Dependencies

Certain sheets must be parsed before others due to data dependencies:

1. **Master Data** (Priority 1): Provides reference data for validation
2. **Rules** (Priority 2): Provides configuration for validation
3. **Draft Board** (Priority 3): Creates team rosters (depends on Master Data)
4. **Team Sheets** (Priority 4): Updates team-specific data (depends on Draft Board)

### Error Handling Strategy

- **Partial Success**: Continue parsing other sheets even if one fails
- **Error Logging**: Log detailed errors for each sheet with context
- **Validation**: Validate extracted data before database insertion
- **Transaction Safety**: Use database transactions for atomic updates
- **Retry Logic**: Retry failed operations with exponential backoff

### Performance Optimization

- **Batch Processing**: Process multiple rows in batches (100-500 rows)
- **Caching**: Cache Pokemon data to avoid repeated API calls
- **Parallel Processing**: Process independent sheets in parallel
- **Rate Limiting**: Respect Google Sheets API rate limits (100 requests/100 seconds)
- **Incremental Updates**: Only update changed records

---

## Implementation Roadmap

### Phase 1: Core Parsers (Week 1)
1. ✅ **TeamsParser** - Already implemented
2. ⏳ **DraftParser** - Implement grid detection and snake draft logic
3. ⏳ **MasterDataParser** - Implement multi-table extraction

### Phase 2: Text Parsers (Week 2)
4. ⏳ **RulesParser** - Implement hierarchical text extraction
5. ⏳ **TeamPageParser** - Implement section-based extraction

### Phase 3: Enhancements (Week 3)
6. ⏳ **GenericParser** - Fallback parser for unknown sheets
7. ⏳ **Image Extraction** - Enhanced image handling across all parsers
8. ⏳ **Comment Extraction** - Extract cell comments for additional context

### Phase 4: Testing & Refinement (Week 4)
9. ⏳ **Integration Testing** - Test full workflow with real sheet
10. ⏳ **Performance Tuning** - Optimize parsing speed and accuracy
11. ⏳ **Error Handling** - Improve error messages and recovery

---

## Next Steps

1. **Run Comprehensive Analysis**: Use `/api/admin/google-sheets/analyze` endpoint with new spreadsheet ID
2. **Review Analysis Results**: Examine detected sheet types, structures, and parsing recommendations
3. **Implement Missing Parsers**: Build DraftParser, MasterDataParser, RulesParser, TeamPageParser
4. **Test Each Parser**: Test parsers individually with actual sheet data
5. **Refine Strategies**: Adjust parsing strategies based on real-world results
6. **Document Patterns**: Document common patterns found in actual sheets for future reference

---

*This analysis will be updated after running comprehensive analysis on the actual Google Sheet.*
