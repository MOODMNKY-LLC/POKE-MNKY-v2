# Estimated Time Remaining Feature

## ✅ Feature Added

Added dynamic estimated time remaining calculation to the progress bar that updates in real-time.

## Implementation Details

### 1. Progress History Tracking
- **Storage**: Uses `useRef` to maintain a progress history array
- **Size**: Keeps last 10 data points (~20 seconds of history)
- **Data Points**: Each entry contains `{ progress: number, timestamp: number }`

### 2. Rate Calculation
- **Method**: Calculates progress rate (% per second) from history
- **Formula**: `progressRatePerSecond = progressDiff / timeDiff`
- **Minimum Data**: Requires at least 2 data points to calculate rate
- **Validation**: Only calculates if progress is increasing

### 3. Time Estimation
- **Formula**: `estimatedSeconds = remainingProgress / progressRatePerSecond`
- **Remaining Progress**: `100 - currentProgress`
- **Result**: Returns estimated seconds remaining (or `null` if can't calculate)

### 4. Human-Readable Formatting
- **Format Function**: `formatTimeRemaining(seconds)`
- **Examples**:
  - `< 60s`: "45s"
  - `< 3600s`: "2m 30s" or "15m"
  - `>= 3600s`: "2h 15m" or "3h"

### 5. UI Integration
- **Display**: Shows below progress message
- **Condition**: Only displays when `estimatedTimeRemaining !== null && > 0`
- **Update Frequency**: Updates every 2 seconds with progress polling
- **Format**: "Estimated time remaining: Xm Ys"

## Code Changes

### `hooks/use-pokepedia-sync.ts`
1. ✅ Added `estimatedTimeRemaining` to `SyncState` interface
2. ✅ Added `progressHistoryRef` to track progress over time
3. ✅ Added `calculateTimeRemaining` function
4. ✅ Updated `pollProgress` to calculate and set estimated time
5. ✅ Updated `checkLocalStatus` to calculate time for active jobs
6. ✅ Clear history when sync completes/fails

### `components/pokepedia-sync-provider.tsx`
1. ✅ Added `estimatedTimeRemaining` to context interface
2. ✅ Added `formatTimeRemaining` helper function
3. ✅ Updated progress banner to display estimated time
4. ✅ Conditional rendering (only shows when estimate available)

## How It Works

1. **Initial State**: No estimate (needs 2+ data points)
2. **After 2 Polls**: Starts calculating rate from progress history
3. **Dynamic Updates**: Recalculates every 2 seconds as progress changes
4. **Accuracy**: Improves as more data points are collected
5. **Completion**: Clears estimate when sync completes

## Example Display

```
┌─────────────────────────────────────┐
│ [████████░░░░░░░░░░░░] 3.4%        │
│ Syncing master phase: 3/88 chunks   │
│ Estimated time remaining: 2h 15m   │
│ 110 Pokemon cached locally          │
└─────────────────────────────────────┘
```

## Edge Cases Handled

- ✅ **No Progress**: Returns `null` if progress isn't increasing
- ✅ **Insufficient Data**: Returns `null` until 2+ data points collected
- ✅ **Zero Rate**: Returns `null` if rate is zero or negative
- ✅ **Completed**: Clears estimate when sync completes
- ✅ **Failed**: Clears estimate when sync fails

## Performance

- **Memory**: Minimal (stores only 10 data points)
- **CPU**: Low (simple calculation every 2 seconds)
- **Network**: No additional requests (uses existing polling)

## Testing

The feature will:
1. ✅ Show estimate after ~4 seconds (2 polls)
2. ✅ Update every 2 seconds
3. ✅ Improve accuracy over time
4. ✅ Handle edge cases gracefully
5. ✅ Clear when sync completes

**Status**: Feature complete and ready for testing! 🎉
