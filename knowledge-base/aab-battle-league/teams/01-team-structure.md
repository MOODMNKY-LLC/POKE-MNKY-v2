# Team Structure and Management

**Category**: Teams  
**Purpose**: Comprehensive guide to team composition, rosters, and management

---

## Introduction

Teams are the fundamental competitive units in the AAB Battle League. Each team consists of a coach managing a roster of Pokemon, competing in battles, and striving for championship success. Understanding team structure, roster management, and team pages is essential for effective league participation.

---

## Team Composition Rules

### Roster Size Requirements

**Minimum**: 8 Pokemon must be on roster during season
**Maximum**: 10 Pokemon can be on roster during season  
**Total Roster**: 11 Pokemon slots available (allows for roster management)

This structure enables:
- Strategic roster management
- Flexibility for team adjustments
- Balanced competition
- Injury/availability management

### Team Names

- **Encouraged**: Team names are encouraged but not mandatory
- **Respectful**: Names must be respectful of other coaches and community
- **Future Considerations**: Team names may be used for streaming/video content

---

## Team Pages Structure

### Google Sheets Organization

Each team has a dedicated page in Google Sheets containing:

**Header Information**:
- **Team Name**: Located at A2:B2
- **Coach Name**: Located at A4:B4
- **Team Identification**: Unique team identifier

**Draft Picks**:
- **Columns C-E**: Contain draft picks
- **Pick Order**: Reflects draft selection order
- **Point Values**: Associated with each pick

### Team Data Organization

Team pages organize information by:
- **Draft Information**: Selected Pokemon and point costs
- **Roster Composition**: Current team members
- **Performance Data**: Battle results and statistics
- **Season Tracking**: Progress through current season

---

## Roster Management

### Draft Selection

During draft:
- Teams select Pokemon based on point values
- Total selections must stay within budget (120 points)
- Selections tracked in team pages
- Draft order determines selection priority

### Roster Adjustments

During season:
- **Tera Captain Changes**: Can drop and replace Tera Captains
- **Roster Limits**: Must maintain 8-10 Pokemon
- **Transaction Rules**: May be modified by battle recording incentives
- **Announcement Requirements**: Changes must be announced before next battle week

### Tera Captain Management

**Designation**:
- Teams designate 3 Pokemon as Tera Captains
- Each Tera Captain has 3 designated Tera types
- Tera types must be announced by deadline (Friday before Week 1)

**Changes**:
- Tera Captains can be dropped during season
- Replacement Tera Captains must be announced
- New Tera types must be specified
- Changes effective before next battle week

---

## Team Statistics and Performance

### Battle Record

Teams track:
- **Wins**: Number of battles won
- **Losses**: Number of battles lost
- **Differential**: Point differential in battles
- **Standings**: Position within division/conference

### Performance Metrics

Additional metrics include:
- **Strength of Schedule**: Difficulty of opponents faced
- **Weighted Results**: Performance adjusted for opponent strength
- **Playoff Qualification**: Standing relative to playoff cutoff
- **Season Progress**: Current week and remaining battles

---

## Database Representation

### Teams Table

The `teams` table stores:
- Team identification and names
- Coach information
- Division and conference assignment
- Season association
- Team metadata

### Team Rosters Table

The `team_rosters` table tracks:
- Pokemon assigned to teams
- Draft points spent per Pokemon
- Roster composition
- Season association
- Draft order information

### Draft Budgets Table

The `draft_budgets` table manages:
- Total budget allocation (120 points)
- Spent points per team
- Remaining budget
- Tera budget (15 points)
- Budget validation

---

## Team Pages Data Structure

### Location in Google Sheets

Team pages follow consistent structure:
- **A2:B2**: Team name
- **A4:B4**: Coach name
- **C-E**: Draft picks and selections
- **Additional Columns**: Performance data, statistics

### Data Relationships

Team pages connect to:
- **Draft Board**: Source of Pokemon selections
- **Master Data Sheet**: League configuration
- **Data Sheet**: Calculations and derived metrics
- **Standings**: Performance rankings

---

## Team Strategy Considerations

### Draft Strategy

Effective team building involves:
- **Budget Management**: Balancing high-point and low-point selections
- **Type Coverage**: Ensuring diverse type representation
- **Role Filling**: Selecting Pokemon for specific battle roles
- **Tera Planning**: Allocating Tera budget strategically

### Roster Optimization

During season management:
- **Matchup Analysis**: Adjusting roster for specific opponents
- **Meta Adaptation**: Responding to league meta trends
- **Injury Management**: Handling Pokemon availability issues
- **Strategic Substitutions**: Making roster changes for advantage

---

## Related Information

- **Draft System**: See `../draft-system/` for draft procedures
- **Battle System**: See `../battle-system/` for battle rules
- **Rules**: See `../rules-governance/` for complete rules
- **Data Structures**: See `../data-structures/` for data organization

---

**Last Updated**: January 18, 2026  
**Status**: Active - Season 5  
**Source**: Google Sheets - Teams Pages, League Rules
