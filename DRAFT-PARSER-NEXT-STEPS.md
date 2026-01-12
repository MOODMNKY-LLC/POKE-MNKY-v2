# Draft Parser - Current Status & Next Steps

## Current Status

✅ **Fixed Issues:**
- Syntax errors resolved
- Grid detection working with lenient fallback
- Team mapping finding 10 teams
- Raw values loading correctly

❌ **Remaining Issue:**
- Pokemon extraction finding 0 picks
- Team columns detected but Pokemon not matching

## Findings

### Team Mapping Results
- Found 10 teams:
  - Team Col3@col2 (column 3)
  - Team Col6@col5 (column 6)  
  - Team 20@col8 (column 9)
  - Team 19@col11 (column 12)
  - Team 18@col14 (column 15)
  - Team 17@col17 (column 18)
  - Team 16@col20 (column 21)
  - Team 15@col23 (column 24)
  - Team 14@col26 (column 27)
  - Team 13@col29 (column 30)

### Sheet Structure (from inspection)
- Row 3 (index 2): Headers at columns 3, 5, 7, 9 (indices 2, 4, 6, 8)
- Row 5 (index 4): Pokemon at columns 3, 5, 7, 9 (indices 2, 4, 6, 8)
  - Column 3: "Arceus"
  - Column 5: "Cetitan"
  - Column 7: "Flutter Mane"
  - Column 9: "Archaludon"

### Issue Identified
There's a mismatch between detected team columns and actual Pokemon columns:
- Team mapping finds teams at columns: 3, 6, 9, 12, 15, 18, 21, 24, 27, 30
- Pokemon appear at columns: 3, 5, 7, 9, 11, 13, 15, 17, 19, 21...

The team detection is finding every 3rd column starting from column 3, but Pokemon appear every 2nd column starting from column 3.

## Next Steps

1. **Fix Team Column Detection**
   - Update team mapping to detect columns based on actual header pattern
   - Headers appear at columns 3, 5, 7, 9 (every 2 columns, not every 3)
   - Or adjust Pokemon extraction to check all columns, not just team columns

2. **Alternative Approach**
   - Instead of pre-detecting team columns, scan all columns in header row
   - For each Pokemon row, check which columns contain Pokemon names
   - Match Pokemon to teams based on column position

3. **Test Other Parsers**
   - Team Page Parser
   - Generic Parser

4. **Database Migrations**
   - Create `league_config` table for Rules parser storage

## Recommendation

The Draft Board structure is more complex than expected. Consider:
1. Making the parser more flexible to handle various draft board formats
2. Using AI to detect the actual structure pattern
3. Or documenting the expected format and adjusting parser to match exactly

For now, the parser runs without errors but needs refinement to match the actual data structure.
