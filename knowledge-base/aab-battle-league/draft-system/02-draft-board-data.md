# Draft Board - Complete Data Structure

**Category**: Draft System  
**Purpose**: Detailed documentation of Draft Board structure based on extracted Google Sheets data

---

## Introduction

The Draft Board contains 409 rows of Pokemon data organized by point values. This documentation is based on actual extracted data from the Google Sheet, providing accurate representation of the draft pool structure, Pokemon organization, and point value assignments.

---

## Draft Board Structure

### Physical Layout

**Row 1**: Header/image area  
**Row 2**: Empty/spacing  
**Row 3**: Point value headers (20, 19, 18, ... down to 1)  
**Row 4**: Additional headers or spacing  
**Row 5+**: Pokemon entries organized by point value

### Point Value Organization

Pokemon are organized into columns by point value:
- **Column Structure**: Each point value (20-1) has its own column
- **Pokemon Entries**: Pokemon listed under their point value
- **Availability**: Pokemon marked as available or drafted
- **Organization**: Logical grouping by competitive tier

---

## Point Value System

### Point Range

**Highest**: 20 points (most powerful/valuable Pokemon)  
**Lowest**: 1 point (least powerful/valuable Pokemon)  
**Total Range**: 20 different point tiers

### Point Distribution

Based on extracted data:
- **High-Tier (15-20 points)**: Elite Pokemon, box legendaries, top-tier threats
- **Mid-Tier (8-14 points)**: Strong Pokemon, good role players
- **Low-Tier (1-7 points)**: Niche Pokemon, support roles, budget options

---

## Pokemon Organization

### By Point Value

Each point tier contains multiple Pokemon:
- **Tier Size**: Varies by point value (higher tiers have fewer Pokemon)
- **Competitive Balance**: Pokemon within same tier have similar power levels
- **Strategic Value**: Point values reflect competitive viability

### Draft Pool Size

**Total Pokemon**: 409 rows (including headers and organization)  
**Available Pokemon**: Varies by season and point restrictions  
**Drafted Pokemon**: Removed from pool as draft progresses

---

## Draft Board Data Structure

### Column Organization

**Point Value Columns**: 
- Each point value (1-20) has dedicated columns
- Pokemon listed vertically under point values
- Easy scanning for available Pokemon at each tier

**Additional Columns**:
- Pokemon names
- Type information (may be included)
- Availability status
- Draft tracking

### Row Organization

**Header Rows**: Point value headers and labels  
**Pokemon Rows**: Individual Pokemon entries  
**Organization Rows**: Grouping and spacing for readability

---

## Draft Tracking

### Availability Status

Pokemon marked as:
- **Available**: Ready to be drafted
- **Drafted**: Selected by a team (removed/struck out)
- **Unavailable**: Not in current draft pool

### Draft Progress

The board tracks:
- **Remaining Pokemon**: Available at each point tier
- **Draft Status**: Current round and pick
- **Team Selections**: Which Pokemon have been chosen

---

## Point Value Analysis

### High-Point Pokemon (15-20)

**Characteristics**:
- Elite competitive viability
- High base stats or powerful abilities
- Meta-defining presence
- Limited availability

**Strategic Value**:
- Foundation pieces for teams
- High budget allocation
- Early draft priorities

### Mid-Point Pokemon (8-14)

**Characteristics**:
- Strong role players
- Good type coverage
- Versatile options
- Balanced power level

**Strategic Value**:
- Core team members
- Moderate budget allocation
- Mid-draft priorities

### Low-Point Pokemon (1-7)

**Characteristics**:
- Niche roles
- Specific utility
- Budget-friendly options
- Support functions

**Strategic Value**:
- Role-specific picks
- Budget efficiency
- Late-draft selections

---

## Database Integration

### Draft Pool Table

The `draft_pool` table mirrors Draft Board:
- **Pokemon Names**: Match sheet entries
- **Point Values**: Correspond to sheet values
- **Availability**: Synced with sheet status
- **Season Association**: Links to current season

### Synchronization

**Bidirectional Sync**:
- Sheet → Database: Initial population
- Database → Sheet: Draft progress updates
- Real-time: Changes reflected in both

---

## Draft Board Pages

### Master Draft Board

**Location**: "Draft Board" tab in Google Sheets  
**Structure**: Complete Pokemon list with point values  
**Purpose**: Primary reference during draft

### Team Views

Teams can view:
- Available Pokemon at their budget range
- Remaining Pokemon by point tier
- Draft progress and statistics

---

## Related Information

- **Draft Rules**: See `../rules-governance/01-complete-rules.md` for draft procedures
- **Team Management**: See `../teams/01-team-structure.md` for team roster information
- **Point System**: See `01-draft-board-structure.md` for point system details

---

**Last Updated**: January 18, 2026  
**Status**: Active - Season 5  
**Source**: Extracted Google Sheets Data - Draft Board (409 rows)
