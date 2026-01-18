# Data Sheet - Detailed Structure and Formulas

**Category**: Data Structures  
**Purpose**: Comprehensive documentation of the Data Sheet structure, formulas, and calculations based on extracted Google Sheets data

---

## Introduction

The Data Sheet contains 573 rows of complex calculations, formulas, and derived metrics that support league operations. This documentation is based on actual extracted data from the Google Sheet, providing accurate representation of how standings, statistics, and advanced metrics are calculated.

---

## Data Sheet Overview

### Sheet Statistics

- **Total Rows**: 573 rows of data
- **Primary Purpose**: Calculations and derived metrics
- **Update Frequency**: Real-time as battle results are entered
- **Complexity**: High - contains formulas, references, and calculations

### Key Sections

Based on extracted data structure:

1. **Standings Calculations**: Win-loss records, point differentials, rankings
2. **Advanced Metrics**: Strength of schedule, weighted results
3. **Statistical Analysis**: Performance trends, comparisons
4. **Playoff Calculations**: Qualification status, seeding
5. **Reference Data**: Lookup tables, constants, configurations

---

## Formula Extraction

### Formula Types

The Data Sheet contains various formula types:

**Lookup Formulas**:
- VLOOKUP, HLOOKUP for cross-referencing data
- INDEX/MATCH for flexible lookups
- References to other sheets (Master Data, Teams, Standings)

**Calculation Formulas**:
- SUM, AVERAGE for aggregations
- IF statements for conditional logic
- Complex nested formulas for advanced metrics

**Reference Formulas**:
- Links to Draft Board for Pokemon data
- Links to Teams Pages for roster information
- Links to Standings for current rankings

---

## Standings Calculation Formulas

### Basic Record Calculation

**Win-Loss Record**:
- Formula: `Wins / Total Battles`
- Location: Calculated from match results
- Updates: Automatically as results are entered

**Point Differential**:
- Formula: `Sum(Win Points) - Sum(Loss Points)`
- Calculation: Aggregates point differences across all battles
- Purpose: Primary tiebreaker after win-loss record

### Advanced Calculations

**Strength of Schedule**:
- Formula: `Average(Opponent Win %)`
- Purpose: Measures opponent difficulty
- Updates: Recalculates as opponent records change

**Weighted Results**:
- Formula: `Battle Result × Opponent Strength Multiplier`
- Purpose: Adjusts results for opponent quality
- Usage: Provides fairer cross-division comparison

---

## Data Relationships

### Cross-Sheet References

The Data Sheet references:

**Master Data Sheet**:
- League configuration values
- Season settings
- Team assignments

**Draft Board**:
- Pokemon point values
- Draft pool availability
- Point budget information

**Teams Pages**:
- Team rosters
- Draft selections
- Team compositions

**Standings Sheet**:
- Current rankings
- Division positions
- Conference standings

---

## Calculation Methods

### Real-Time Updates

Formulas update automatically when:
- Battle results are entered
- Standings change
- Team rosters are modified
- League configuration updates

### Formula Dependencies

Formulas have dependencies on:
- Other cells within Data Sheet
- Cells in other sheets
- External data sources
- Manual inputs

---

## Key Formulas and Their Purposes

### Standings Formulas

**Division Rankings**:
- Calculates team position within division
- Considers win-loss record and point differential
- Updates automatically with new results

**Conference Standings**:
- Aggregates division standings
- Calculates conference-wide rankings
- Determines playoff qualification

### Statistical Formulas

**Performance Metrics**:
- Calculates team performance trends
- Tracks improvement over time
- Identifies patterns and anomalies

**Comparative Analysis**:
- Compares teams across divisions
- Adjusts for schedule difficulty
- Provides fair performance comparison

---

## Migration to Programmatic System

### Current Implementation

**Hybrid System**: Both spreadsheet formulas and database calculations  
**Verification**: Programmatic system verified against spreadsheet formulas  
**Documentation**: Formulas documented for accurate migration

### Programmatic Equivalents

Database views and functions replicate:
- Standings calculations → Materialized views
- Advanced metrics → SQL functions
- Statistical analysis → Application logic
- Real-time updates → Database triggers

---

## Formula Documentation

### Example Formulas

**Win Percentage**: `=Wins/TotalBattles`  
**Point Differential**: `=SUM(WinPoints)-SUM(LossPoints)`  
**Strength of Schedule**: `=AVERAGE(OpponentWinPercentages)`  
**Weighted Win**: `=WinValue*OpponentStrengthMultiplier`

### Complex Formulas

**Playoff Qualification**:
- Multiple nested IF statements
- References to division standings
- Tiebreaker logic
- Wild card calculations

**Advanced Rankings**:
- Weighted averages
- Conditional aggregations
- Cross-sheet lookups
- Dynamic range references

---

## Data Validation

### Input Validation

Formulas include validation for:
- Result format correctness
- Point differential reasonableness
- Standings consistency
- Data integrity checks

### Error Handling

Formulas handle:
- Missing data gracefully
- Division by zero errors
- Invalid references
- Out-of-range values

---

## Related Information

- **Master Data Sheet**: See `01-master-data-sheet.md` for core data
- **Standings**: See `../battle-system/02-standings-calculation.md` for standings details
- **Pokedex**: See `03-pokedex-structure.md` for Pokemon reference data
- **App Integration**: See `../app-integration/` for API access

---

**Last Updated**: January 18, 2026  
**Status**: Active - Hybrid System (Spreadsheet + Programmatic)  
**Source**: Extracted Google Sheets Data - Data Sheet (573 rows)
