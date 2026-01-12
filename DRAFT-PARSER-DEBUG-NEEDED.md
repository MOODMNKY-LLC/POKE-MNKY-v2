# Draft Parser Debug Needed

## Current Status

✅ **Working:**
- Team mapping: Successfully finds 9 teams (20-12 Points)
- Data access: Pokemon names visible in columns ("Flutter Mane", "Archaludon", etc.)
- Column detection: Correctly identifies point value columns

❌ **Not Working:**
- Pokemon extraction: Finding 0 picks despite data being present
- Validation: Pokemon names not passing validation or not being added to picks array

## Debug Findings

### Data Confirmed Present
- Row 5, Column 9 (I): "Flutter Mane"
- Row 5, Column 12 (L): "Archaludon"  
- Row 5, Column 15 (O): "Deoxys"
- Row 6, Column 9: "Gouging Fire"
- Row 6, Column 12: "Chi-Yu"
- Row 6, Column 15: "Deoxys Defense"

### Validation Checks
For "Flutter Mane":
- ✅ Length >= 3: 12 chars
- ✅ Length <= 30: 12 chars
- ✅ Not number: "Flutter Mane" !== /^\d+$/
- ✅ Not points: "Flutter Mane" !== /\d+\s*points?/i
- ✅ Not banned: "Flutter Mane" !== /banned/i
- ✅ First letter uppercase: "F" === "F".toUpperCase()

All validation checks should pass, but picks aren't being added.

## Possible Issues

1. **Type Mismatch**: `applySnakeDraftLogic` expects picks without `pointValue`, but `extractPicks` now returns picks with `pointValue`
2. **Silent Validation Failure**: Validation might be failing due to hidden characters or formatting
3. **Early Return**: Code might be returning before reaching the push statement
4. **Array Access Issue**: `rowData[team.columnIndex]` might not be accessing correctly

## Next Debug Steps

1. Add unconditional validation logging (remove conditions)
2. Check for hidden characters in Pokemon names
3. Verify `applySnakeDraftLogic` signature matches `extractPicks` return type
4. Add try-catch around pick addition to catch any errors
5. Test with a single Pokemon name manually

## Code Location

- `lib/google-sheets-parsers/draft-parser.ts`
- `extractPicks()` method (lines ~440-495)
- Validation logic (lines ~470-490)
