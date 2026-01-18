# Current Standings - Structure and Data

**Category**: Battle System  
**Purpose**: Documentation of current standings structure based on extracted Google Sheets data

---

## Introduction

The Standings sheet contains current league standings, division rankings, and conference positions. This documentation is based on actual extracted data, providing accurate representation of how standings are organized and displayed.

---

## Standings Sheet Structure

### Sheet Overview

**Total Rows**: Extracted standings data  
**Organization**: By division and conference  
**Update Frequency**: Real-time as results are entered  
**Purpose**: Current league position tracking

### Key Sections

Based on extracted data:

1. **Weekly Battle Results**: Current week matchups and results
2. **Top Performers**: Weekly standout Pokemon and teams
3. **Overall League Standings**: Complete league-wide rankings
4. **Divisional Standings**: Division-specific rankings
5. **Conference Standings**: Conference-wide positions

---

## Standings Organization

### Weekly Results Section

**Structure**:
- **Week Number**: Current week identifier
- **Matchups**: Team vs Team battles
- **Results**: Win/Loss with differential
- **Top Performers**: Weekly standout Pokemon

**Data Points**:
- Coach names
- Battle results (W/L)
- Point differentials
- Top performing Pokemon with KO counts

### Overall Standings

**Organization**:
- **Team Name**: Full team name
- **Record**: Win-Loss record (e.g., "10-1")
- **Differential**: Point differential (e.g., "+5", "-3")
- **Ranking**: League-wide position

---

## Division Standings

### Lance Conference

**Kanto Division**:
- Teams ranked 1st through 5th
- Record and differential shown
- Strength of schedule included

**Johto Division**:
- Teams ranked 1st through 5th
- Record and differential shown
- Strength of schedule included

### Leon Conference

**Hoenn Division**:
- Teams ranked 1st through 5th
- Record and differential shown
- Strength of schedule included

**Sinnoh Division**:
- Teams ranked 1st through 5th
- Record and differential shown
- Strength of schedule included

---

## Standings Metrics

### Record Format

**Format**: "Wins - Losses" (e.g., "10-1", "7-4")  
**Primary Ranking**: Based on win-loss record  
**Tiebreaker**: Point differential

### Point Differential

**Format**: Signed number (e.g., "+27", "-11", "+5")  
**Calculation**: Sum of point differences across all battles  
**Purpose**: Primary tiebreaker after record

### Strength of Schedule

**Format**: Percentage (e.g., "47%", "54%")  
**Calculation**: Average opponent win percentage  
**Purpose**: Adjusts standings for schedule difficulty

---

## Current Season Standings

### Top Teams

Based on extracted data structure:
- **Leading Teams**: Teams with best records
- **Playoff Contenders**: Teams in playoff position
- **Middle Pack**: Teams competing for position
- **Rebuilding**: Teams with lower records

### Standings Factors

Teams ranked by:
1. **Win-Loss Record**: Primary factor
2. **Point Differential**: Tiebreaker
3. **Strength of Schedule**: Advanced metric
4. **Head-to-Head**: If applicable

---

## Playoff Qualification

### Division Winners

**Qualification**: Top team in each division  
**Total Spots**: 4 division winners  
**Automatic**: Guaranteed playoff berth

### Wild Cards

**Qualification**: Next best teams by record  
**Total Spots**: Varies by season  
**Determination**: Based on overall standings

---

## Database Integration

### Standings Views

Database materialized views replicate:
- **Division Standings**: SQL-based calculations
- **Conference Standings**: Aggregated views
- **Overall Standings**: League-wide rankings
- **Playoff Status**: Qualification indicators

### Synchronization

**Sheet → Database**: Standings data synced  
**Database → Sheet**: May update sheet for verification  
**Real-Time**: Both systems stay current

---

## Related Information

- **Standings Calculation**: See `02-standings-calculation.md` for calculation methods
- **Battle Rules**: See `01-battle-rules.md` for battle procedures
- **Seasons**: See `../seasons/` for season structure
- **Teams**: See `../teams/` for team information

---

**Last Updated**: January 18, 2026  
**Status**: Active - Current Season  
**Source**: Extracted Google Sheets Data - Standings Sheet
