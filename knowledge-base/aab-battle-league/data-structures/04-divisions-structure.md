# Divisions - Structure and Organization

**Category**: Data Structures  
**Purpose**: Comprehensive documentation of division structure based on extracted Google Sheets data

---

## Introduction

The Divisions sheet organizes teams into conferences and divisions, enabling structured competition and playoff qualification. This documentation is based on actual extracted data, providing accurate representation of league organization.

---

## Conference Structure

### Lance Conference

**Divisions**:
- **Kanto Division**: 6 teams
- **Johto Division**: 6 teams

**Total Teams**: 12 teams in Lance Conference

### Leon Conference

**Divisions**:
- **Hoenn Division**: 6 teams
- **Sinnoh Division**: 6 teams

**Total Teams**: 12 teams in Leon Conference

### League Total

**Total Teams**: 24 teams (12 per conference, 6 per division)

---

## Division Organization

### Team Assignment

Teams assigned to divisions based on:
- **Geographic**: Location-based (if applicable)
- **Balanced**: Competitive balance considerations
- **Historical**: Previous season performance
- **Random**: Random assignment for fairness

### Division Size

**Standard**: 6 teams per division  
**Balance**: Ensures competitive balance  
**Playoffs**: Top teams from each division qualify

---

## Standings Within Divisions

### Ranking System

Teams ranked within division by:
1. **Win-Loss Record**: Primary ranking factor
2. **Point Differential**: Primary tiebreaker
3. **Strength of Schedule**: Advanced consideration
4. **Head-to-Head**: If teams tied

### Division Leaders

**1st Place**: Division winner (playoff qualification)  
**2nd-3rd**: Strong playoff contenders  
**4th-5th**: Competing for position  
**6th**: Rebuilding/developing

---

## Conference Standings

### Aggregation

Conference standings aggregate:
- **Division Standings**: Combined division results
- **Cross-Division**: Results across divisions
- **Overall Performance**: Conference-wide metrics

### Conference Leaders

**Top Teams**: Best records across conference  
**Playoff Spots**: Multiple teams qualify  
**Wild Cards**: Additional playoff opportunities

---

## Playoff Structure

### Division Winners

**Qualification**: Top team in each division  
**Total**: 4 division winners  
**Automatic**: Guaranteed playoff berth

### Wild Card Teams

**Qualification**: Next best teams by record  
**Determination**: Conference-wide standings  
**Total**: Varies by season configuration

---

## Database Representation

### Teams Table

The `teams` table stores:
- Division assignment (Kanto, Johto, Hoenn, Sinnoh)
- Conference assignment (Lance, Leon)
- Team identification
- Season association

### Standings Views

Database views calculate:
- **Division Standings**: Within-division rankings
- **Conference Standings**: Cross-division rankings
- **Playoff Qualification**: Based on standings
- **Seeding**: Playoff seeding determination

---

## Related Information

- **League Structure**: See `../league-overview/01-league-structure.md` for organization
- **Standings**: See `../battle-system/03-current-standings.md` for standings data
- **Teams**: See `../teams/` for team information
- **Seasons**: See `../seasons/` for season structure

---

**Last Updated**: January 18, 2026  
**Status**: Active - Current Season  
**Source**: Extracted Google Sheets Data - Divisions Sheet
