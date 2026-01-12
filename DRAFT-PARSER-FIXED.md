# Draft Parser - FIXED! ✅

## Issue Resolved

The Draft parser is now successfully extracting Pokemon picks from the Draft Board!

## Root Cause

The issue was a **column offset**: 
- Point value headers are at columns **I, L, O** (indices 8, 11, 14)
- Pokemon appear at columns **J, M, P** (indices 9, 12, 15) - **one column after** the headers

## Fix Applied

Updated `mapTeamColumns()` to use `pokemonColumnIndex = col + 1` instead of `col`:
- When header "20 Points" is detected at column I (index 8)
- Pokemon column is set to column J (index 9)
- This matches the actual sheet structure

## Results

✅ **Successfully parsed 168 draft picks**
- Pokemon extraction working correctly
- Point values correctly associated with picks
- Round numbers calculated properly

## Remaining Issue

⚠️ **Teams not found in database**
- Parser is looking for teams named "Team 20 Points", "Team 19 Points", etc.
- These teams don't exist in the database yet
- Need to either:
  1. Create teams with these names, OR
  2. Match point values to existing teams, OR
  3. Update team matching logic to use point values differently

## Next Steps

1. **Team Matching Strategy**: Decide how to match point values to teams
   - Option A: Create teams named "Team X Points"
   - Option B: Match point values to existing team names
   - Option C: Store point values separately and match later

2. **Database Integration**: Update team creation/matching logic

3. **Test Team Page Parser**: Verify structured extraction works

4. **Point System Integration**: Connect draft picks to point spending

## Files Modified

- `lib/google-sheets-parsers/draft-parser.ts`
  - Fixed column offset in `mapTeamColumns()`
  - Pokemon now correctly extracted from columns J, M, P, etc.

## Test Results

```
✅ Successfully parsed 168 draft picks
⚠️ Teams not found in database (expected - needs team matching strategy)
```

The parser is now functionally correct and ready for team matching integration!
