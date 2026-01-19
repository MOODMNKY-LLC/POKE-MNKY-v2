# Pokemon Sync Frontend Integration Guide

## Overview

This document explains how the Pokemon data sync system is integrated into the admin dashboard for manual control, verification, and validation.

---

## Architecture

### Components

1. **API Route** (`app/api/admin/sync/route.ts`)
   - Handles sync operations (start, stop, status)
   - Executes the sync script server-side
   - Tracks sync status in memory (can be upgraded to Redis/DB)

2. **Admin Component** (`components/admin/pokemon-sync-control.tsx`)
   - React component for sync control UI
   - Polls API for real-time status updates
   - Provides configuration options (range, batch size, rate limit)

3. **Admin Dashboard** (`app/admin/page.tsx`)
   - Integrates the sync control component
   - Accessible to authenticated admin users

---

## How It Works

### 1. Starting a Sync

**User Flow**:
1. Admin navigates to `/admin`
2. Scrolls to "Pokemon Data Sync Control" section
3. Configures sync parameters:
   - Start ID (default: 1)
   - End ID (default: 1025)
   - Batch Size (default: 50)
   - Rate Limit (default: 100ms)
4. Clicks "Start Sync" button

**Technical Flow**:
```typescript
// Component sends POST request
POST /api/admin/sync
{
  start: 1,
  end: 1025,
  batchSize: 50,
  rateLimitMs: 100
}

// API route:
// 1. Validates user authentication
// 2. Checks if sync is already running
// 3. Spawns child process to execute sync script
// 4. Returns immediately with "Sync started" message
```

### 2. Monitoring Progress

**User Flow**:
- Component automatically polls `/api/admin/sync` every 2 seconds
- Shows real-time status:
  - Running indicator with spinner
  - Progress bar (if available)
  - Synced/Skipped/Failed counts
  - Duration

**Technical Flow**:
```typescript
// Component polls GET /api/admin/sync every 2 seconds
useEffect(() => {
  if (syncStatus.status === 'running') {
    const interval = setInterval(async () => {
      const response = await fetch('/api/admin/sync')
      const data = await response.json()
      setSyncStatus(data)
    }, 2000)
    return () => clearInterval(interval)
  }
}, [syncStatus.status])
```

### 3. Stopping a Sync

**User Flow**:
- Click "Stop Sync" button while sync is running
- Sync is cancelled immediately

**Technical Flow**:
```typescript
// Component sends DELETE request
DELETE /api/admin/sync

// API route:
// 1. Validates user authentication
// 2. Kills the running sync process
// 3. Updates status to "failed" with "cancelled" message
```

---

## API Endpoints

### GET `/api/admin/sync`

**Purpose**: Get current sync status

**Response**:
```json
{
  "status": "idle" | "running" | "completed" | "failed",
  "progress": {
    "synced": 100,
    "skipped": 900,
    "failed": 0,
    "total": 1000,
    "percent": 100
  },
  "error": "Error message if failed",
  "startTime": 1234567890,
  "endTime": 1234567890
}
```

### POST `/api/admin/sync`

**Purpose**: Start a new sync

**Request Body**:
```json
{
  "start": 1,
  "end": 1025,
  "batchSize": 50,
  "rateLimitMs": 100
}
```

**Response**:
```json
{
  "message": "Sync started",
  "status": "running"
}
```

**Errors**:
- `401 Unauthorized` - User not authenticated
- `409 Conflict` - Sync already running
- `400 Bad Request` - Invalid parameters

### DELETE `/api/admin/sync`

**Purpose**: Stop/cancel running sync

**Response**:
```json
{
  "message": "Sync cancelled"
}
```

---

## Component Features

### Status Display

- **Idle**: Gray badge with info icon
- **Running**: Blue badge with spinning loader
- **Completed**: Green badge with checkmark
- **Failed**: Red badge with X icon

### Progress Tracking

- Progress bar showing completion percentage
- Counts for synced, skipped, and failed Pokemon
- Start time and duration display

### Configuration Options

- **Start ID**: First Pokemon ID to sync (1-1025)
- **End ID**: Last Pokemon ID to sync (1-1025)
- **Batch Size**: Number of Pokemon per batch (1-100)
- **Rate Limit**: Milliseconds between API calls (50-1000)

### Error Handling

- Toast notifications for errors
- Alert boxes for sync failures
- Validation of input parameters

---

## Security

### Authentication

- All API routes require authenticated user
- Uses Supabase Auth to verify user identity
- Admin-only access (can add RBAC check)

### Authorization

Currently checks:
- User is authenticated

Future enhancement:
- Check user role (admin only)
- Rate limiting for sync requests

---

## Limitations & Future Enhancements

### Current Limitations

1. **In-Memory Status**: Sync status is stored in memory, so it's lost on server restart
2. **No Progress Parsing**: Can't parse detailed progress from script output yet
3. **Single Sync**: Only one sync can run at a time
4. **No History**: No persistent sync history/logs

### Future Enhancements

1. **Database Storage**: Store sync status in database for persistence
2. **Progress Parsing**: Parse script output for detailed progress
3. **Sync History**: Store sync logs in database
4. **Multiple Syncs**: Support concurrent syncs with IDs
5. **Scheduled Syncs**: Add cron job support
6. **Email Notifications**: Notify admins when sync completes
7. **Real-time Updates**: Use Server-Sent Events (SSE) instead of polling

---

## Usage Example

### Full Sync (All Pokemon)

1. Navigate to `/admin`
2. Scroll to "Pokemon Data Sync Control"
3. Leave defaults (Start: 1, End: 1025)
4. Click "Start Sync"
5. Monitor progress
6. Wait for completion (~2-3 minutes)

### Incremental Sync (Specific Range)

1. Navigate to `/admin`
2. Scroll to "Pokemon Data Sync Control"
3. Set Start ID: 1000
4. Set End ID: 1025
5. Click "Start Sync"
6. Monitor progress
7. Wait for completion (~15-30 seconds)

### Validation After Sync

1. Check sync status shows "Completed"
2. Verify synced count matches expected
3. Check database:
   ```sql
   SELECT COUNT(*) FROM pokemon_cache;
   SELECT COUNT(*) FROM pokemon;
   ```
4. Test draft system with synced data
5. Verify Pokemon display correctly in pokedex

---

## Troubleshooting

### Sync Won't Start

- Check user is authenticated
- Verify no other sync is running
- Check API route logs for errors

### Sync Stuck

- Check sync script is running: `ps aux | grep sync-pokemon-data`
- Check API route logs
- Try stopping and restarting sync

### Progress Not Updating

- Check browser console for errors
- Verify API route is responding
- Check network tab for failed requests

### Sync Fails Immediately

- Check environment variables are set
- Verify sync script exists at `scripts/sync-pokemon-data.ts`
- Check API route logs for error details

---

## Integration Points

### Admin Dashboard

- Component added to `/admin` page
- Located after "Poképedia Dashboard" card
- Before "Showdown Pokedex Sync" section

### API Routes

- `/api/admin/sync` - Main sync API
- Uses Next.js API routes (server-side)
- Executes sync script via child_process

### Database Tables

- `pokemon_cache` - Stores synced Pokemon data
- `pokemon` - Stores unique Pokemon names/types
- Both tables updated by sync script

---

## Testing

### Manual Testing

1. Start a sync with small range (1-10)
2. Verify status updates in real-time
3. Stop sync mid-way
4. Verify sync cancels correctly
5. Start full sync (1-1025)
6. Verify completion and data quality

### Automated Testing (Future)

- Unit tests for API routes
- Integration tests for component
- E2E tests for sync workflow

---

**Status**: ✅ **IMPLEMENTED AND READY FOR USE**

The sync control component is now integrated into the admin dashboard and ready for manual sync operations, verification, and validation.
