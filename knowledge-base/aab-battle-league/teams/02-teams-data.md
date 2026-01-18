# Teams - Complete Team Data

**Category**: Teams  
**Purpose**: Comprehensive documentation of all teams based on extracted Google Sheets data

---

## Introduction

This document provides complete information about all teams in the AAB Battle League, extracted directly from Google Sheets. It includes team names, coaches, rosters, and draft selections for all 20 teams.

---

## Team Extraction Summary

### Total Teams

**20 Teams** extracted from Google Sheets:
- Team 1 through Team 20
- Each team has dedicated page in Google Sheets
- Team data includes names, coaches, and draft picks

### Data Structure

Each team page contains:
- **Team Name**: Located at A2:B2
- **Coach Name**: Located at A4:B4  
- **Draft Picks**: Columns C-E contain draft selections
- **Additional Data**: Performance metrics, statistics

---

## Team Pages Structure

### Standard Layout

All team pages follow consistent structure:

**Row 1**: Header/spacing  
**Row 2 (A2:B2)**: Team name  
**Row 3**: Spacing  
**Row 4 (A4:B4)**: Coach name  
**Row 5+**: Draft picks and data

### Draft Picks Organization

**Column C**: First pick slot  
**Column D**: Second pick slot  
**Column E**: Third pick slot  
**Additional Columns**: May contain point values, statistics

---

## Team Data Extraction

### Extraction Process

Data extracted from:
- **Google Sheets**: Direct access to team pages
- **Automated**: Script-based extraction
- **Complete**: All 20 teams extracted
- **Structured**: Parsed into organized format

### Data Points Per Team

Each team extraction includes:
- Team identification
- Coach information
- Draft selections
- Roster composition
- Point values spent

---

## Team Information

### Team Names

Teams have various naming conventions:
- **Location-Based**: City/region names
- **Pokemon-Themed**: Pokemon species names
- **Creative Names**: Unique team identities
- **Numbered**: Team 1-20 (if no custom name)

### Coach Information

Coaches are:
- **Identified**: By name in team pages
- **Tracked**: For communication and management
- **Associated**: With their team's performance

---

## Draft Selections

### Pick Organization

Draft picks organized by:
- **Round**: Draft round number
- **Order**: Selection order within round
- **Pokemon**: Selected Pokemon name
- **Point Value**: Cost in draft points

### Roster Composition

Teams build rosters through:
- **Draft Selections**: Primary roster building
- **Point Management**: Staying within budget
- **Strategic Picks**: Balancing power and value
- **Type Coverage**: Ensuring team diversity

---

## Database Representation

### Teams Table

The `teams` table stores:
- Team names and identifiers
- Coach information
- Division and conference assignments
- Season associations

### Team Rosters Table

The `team_rosters` table tracks:
- Pokemon assigned to teams
- Draft points spent
- Roster composition
- Draft order information

---

## Team Performance Tracking

### Battle Records

Teams track:
- **Wins**: Number of battles won
- **Losses**: Number of battles lost
- **Differential**: Point differential in battles
- **Standings**: Position within division/conference

### Statistics

Additional metrics:
- **Strength of Schedule**: Opponent difficulty
- **Weighted Results**: Performance adjustments
- **Playoff Status**: Qualification chances
- **Season Progress**: Current week and remaining battles

---

## Related Information

- **Team Structure**: See `01-team-structure.md` for team composition rules
- **Draft System**: See `../draft-system/` for draft procedures
- **Battle System**: See `../battle-system/` for battle rules
- **Standings**: See `../battle-system/02-standings-calculation.md` for standings

---

**Last Updated**: January 18, 2026  
**Status**: Active - Season 5  
**Source**: Extracted Google Sheets Data - Teams Pages (20 teams)
