# Header Navigation Consolidation Plan

**Date**: 2026-01-25  
**Status**: Implementation Ready

---

## Current State Analysis

### Desktop Navigation Structure
**9+ individual buttons** with multiple dividers:
1. Standings (individual)
2. Teams (individual)
3. Schedule (individual)
4. Draft (individual)
5. Showdown (individual) - but has 5 sub-pages
6. Pokédex (individual)
7. Insights (individual)
8. Videos (individual)
9. API Playground (individual)
10. Dashboard (individual, conditional)
11. Resources (dropdown with only 1 item)

**Issues:**
- Too many individual buttons cluttering the header
- Showdown is a single button but has multiple sub-features
- Reference materials (Pokédex, Insights, Videos) are separate
- Testing/API tools are separate from Resources
- Dashboard could be grouped with user-specific items

---

## Proposed Consolidation

### 1. League Section (Keep as Individual Buttons)
**Rationale**: Core league features, frequently accessed, should remain prominent

- Standings
- Teams
- Schedule
- Draft

### 2. Battle Dropdown (NEW)
**Rationale**: All battle/team-building features grouped together

- Showdown Hub
- Match Lobby
- Team Library
- Team Validator
- Replay Library
- Team Builder

### 3. Reference Dropdown (NEW)
**Rationale**: Reference materials and learning resources grouped together

- Pokédex
- Insights
- Videos

### 4. Resources Dropdown (EXPAND)
**Rationale**: Developer/testing tools grouped together

- API Documentation
- API Playground
- MCP Testing Playground

### 5. My Dropdown (NEW - Conditional)
**Rationale**: User-specific features grouped together (only for authenticated users)

- Dashboard
- (Future: Profile, Settings)

---

## Benefits

1. **Reduced Clutter**: From 9+ buttons to 4 buttons + 3-4 dropdowns
2. **Better Organization**: Related features grouped logically
3. **Improved UX**: Easier to find related features
4. **Mobile-Friendly**: Fewer items in mobile menu
5. **Scalable**: Easy to add new items to dropdowns

---

## Implementation

### Desktop Navigation Structure:
```
[Logo] | [Standings] [Teams] [Schedule] [Draft] | [Battle ▼] | [Reference ▼] | [Resources ▼] | [My ▼] | [Theme] [User]
```

### Mobile Navigation:
- Same structure but in sheet/menu
- Dropdowns become expandable sections

---

## Icon Mapping

- **Battle**: Swords
- **Reference**: BookOpen
- **Resources**: FileText
- **My**: LayoutDashboard
