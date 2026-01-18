# Draft Board Structure

**Category**: Draft System  
**Purpose**: Comprehensive documentation of the draft board structure and point system

---

## Introduction

The draft board is the central reference for all available Pokemon during the draft process. It contains point values, organizes Pokemon by tiers, and tracks which Pokemon have been drafted. Understanding the draft board structure is essential for effective draft strategy and team building.

---

## Draft Board Organization

### Physical Structure

The draft board is organized in Google Sheets with the following structure:

- **Row 3**: Contains point value headers (20, 19, 18, etc. down to 1)
- **Row 4**: Header row (may contain additional information)
- **Row 5+**: Pokemon entries organized by point value

### Point Value System

Pokemon are assigned point values ranging from:
- **Highest**: 20 points (most powerful/valuable Pokemon)
- **Lowest**: 1 point (least powerful/valuable Pokemon)

Point values reflect competitive viability, power level, and strategic value. Higher point Pokemon are typically more powerful but consume more of a team's budget.

---

## Draft Budget System

### Team Budgets (Season 5)

- **Draft Budget**: 120 points per team
- **Tera Budget**: 15 points per team
- **Total Budget**: 135 points (combined)

### Budget Management

Teams must manage their budgets carefully:
- **Point Tracking**: Teams track spent points and remaining budget
- **Budget Validation**: System warns if picks exceed remaining budget (non-blocking)
- **Budget Exhaustion**: Teams cannot draft Pokemon if budget is insufficient

### Budget Calculation

- **Spent Points**: Sum of all drafted Pokemon point values
- **Remaining Points**: Total budget minus spent points
- **Budget Status**: Tracked in `draft_budgets` table per team per season

---

## Draft Process

### Draft Order

**Snake Draft Format**:
- Round 1: Team 1 → Team 2 → Team 3 → ... → Team N
- Round 2: Team N → ... → Team 3 → Team 2 → Team 1
- Pattern repeats for all rounds

**Example**: If Team 1 picks first in Round 1, they pick last in Round 2 (pick 40 if 20 teams).

### Draft Timing

- **Time Limit**: 45 seconds per pick
- **Skip Penalty**: If unable to pick in time, skipped that round with 45 seconds added to next pick
- **Draft Duration**: Varies based on number of teams and picks

### Draft Tracking

When a Pokemon is drafted:
- **Removed from Board**: Pokemon is struck out or removed from draft board
- **Added to Roster**: Pokemon added to team's roster
- **Budget Updated**: Team's spent points increased
- **Point Validation**: System checks if pick is within budget

---

## Draft Board Data Structure

### Point-Based Organization

Pokemon are organized by point value:
- Each point tier (20, 19, 18, etc.) contains multiple Pokemon
- Pokemon within same point tier have similar power levels
- Teams must balance high-point and low-point selections

### Pokemon Information

Each Pokemon entry contains:
- **Name**: Pokemon species name
- **Point Value**: Draft cost in points
- **Availability Status**: Whether Pokemon is available or drafted
- **Additional Data**: May include type, stats, or other relevant information

---

## Draft Strategy Considerations

### Budget Allocation

Effective draft strategy involves:
- **Balanced Approach**: Mix of high-point and low-point Pokemon
- **Value Picks**: Identifying undervalued Pokemon at lower point tiers
- **Budget Reserve**: Saving points for key positions or late-round picks
- **Tera Planning**: Allocating Tera budget for Tera Captains

### Point Value Analysis

Understanding point values helps with:
- **Tier Identification**: Recognizing power level tiers
- **Value Assessment**: Determining if Pokemon is worth its point cost
- **Budget Efficiency**: Maximizing team strength within budget constraints
- **Strategic Planning**: Planning draft order based on point availability

---

## Draft Pool Management

### Pokemon Availability

The draft pool includes:
- **Available Pokemon**: All Pokemon not yet drafted
- **Drafted Pokemon**: Pokemon selected by teams (removed from pool)
- **Banned Pokemon**: Pokemon excluded from draft (Pokemon of Ruin, etc.)

### Pool Updates

The draft pool is updated:
- **Pre-Draft**: Initial pool setup with all available Pokemon
- **During Draft**: Real-time updates as Pokemon are selected
- **Post-Draft**: Final pool state with remaining undrafted Pokemon

---

## Database Integration

### Draft Pool Table

The `draft_pool` table stores:
- Available Pokemon for drafting
- Point values for each Pokemon
- Availability status
- Season association

### Team Rosters Table

The `team_rosters` table tracks:
- Drafted Pokemon per team
- Draft points spent
- Draft order and timing
- Roster composition

### Draft Budgets Table

The `draft_budgets` table manages:
- Total budget per team per season
- Spent points tracking
- Remaining points calculation
- Budget validation

---

## Draft Board Pages

### Master Draft Board

The master draft board contains:
- All available Pokemon
- Point value organization
- Real-time draft tracking
- Availability status

### Team-Specific Views

Teams can view:
- Their own drafted Pokemon
- Remaining budget
- Available Pokemon at various point tiers
- Draft progress and statistics

---

## Related Information

- **Draft Rules**: See `../rules-governance/01-complete-rules.md` for draft procedures
- **Team Management**: See `../teams/` for team roster information
- **Point System**: See `../draft-system/02-point-system.md` for detailed point analysis

---

**Last Updated**: January 18, 2026  
**Status**: Active - Season 5  
**Source**: Google Sheets - Draft Board page
