# Integration Worker Testing Guide

**Date**: January 15, 2026  
**Status**: Core Tests Complete ✅

---

## Quick Test Commands

### 1. WebSocket Connection Test
```bash
pnpm test:websocket
```
**Purpose**: Verify WebSocket connection to Showdown server  
**Duration**: ~15 seconds  
**Status**: ✅ PASSED

### 2. Integration Test Suite
```bash
pnpm test:integration
```
**Purpose**: Test all components and database connections  
**Duration**: ~5 seconds  
**Status**: ✅ PASSED

### 3. Room Manager Test
```bash
pnpm test:room-manager
```
**Purpose**: Test Room Manager's full functionality  
**Duration**: ~35 seconds  
**Status**: ✅ PASSED

### 4. Replay Parser Test (Requires Real Room ID)
```bash
TEST_ROOM_ID=<room-id> pnpm test
```
**Purpose**: Test replay parsing with real battle data  
**Duration**: ~10 seconds  
**Status**: ⏳ Ready (requires real room ID)

---

## Test Results Summary

### ✅ Core Functionality Tests - ALL PASSED

| Test | Status | Notes |
|------|--------|-------|
| WebSocket Connection | ✅ PASSED | Connects successfully, stable |
| Supabase Connection | ✅ PASSED | Database accessible |
| Room Manager | ✅ PASSED | Polling and subscriptions work |
| Database Updater | ✅ PASSED | Can query and update matches |
| Component Initialization | ✅ PASSED | All components initialize correctly |

### ⏳ Integration Tests (Require Real Data)

| Test | Status | Requirements |
|------|--------|--------------|
| Replay Parser | ⏳ READY | Real battle room ID |
| End-to-End Flow | ⏳ READY | Completed battle |
| Discord Notifications | ⏳ READY | Webhook configured |

---

## Running Tests Locally

### Prerequisites

1. **Environment Variables** (set in shell or `.env`):
   ```bash
   SHOWDOWN_SERVER_URL=https://aab-showdown.moodmnky.com
   SUPABASE_URL=https://chmrszrwlfeqovwxyrmt.supabase.co
   SUPABASE_SERVICE_ROLE_KEY=<your-key>
   ```

2. **Dependencies Installed**:
   ```bash
   pnpm install
   ```

### Test Execution

**Windows PowerShell**:
```powershell
cd scripts/integration-worker
$env:SHOWDOWN_SERVER_URL="https://aab-showdown.moodmnky.com"
$env:SUPABASE_URL="https://chmrszrwlfeqovwxyrmt.supabase.co"
$env:SUPABASE_SERVICE_ROLE_KEY="<your-key>"
pnpm test:websocket
pnpm test:integration
pnpm test:room-manager
```

**Linux/Mac**:
```bash
cd scripts/integration-worker
export SHOWDOWN_SERVER_URL="https://aab-showdown.moodmnky.com"
export SUPABASE_URL="https://chmrszrwlfeqovwxyrmt.supabase.co"
export SUPABASE_SERVICE_ROLE_KEY="<your-key>"
pnpm test:websocket
pnpm test:integration
pnpm test:room-manager
```

---

## Testing with Real Data

### Test Replay Parser

1. **Get a real battle room ID**:
   - Complete a battle in Showdown
   - Note the room ID (e.g., `battle-gen9avgatbest-123456`)

2. **Run test**:
   ```bash
   TEST_ROOM_ID=battle-gen9avgatbest-123456 pnpm test
   ```

3. **Expected output**:
   - Replay fetched successfully
   - Winner, scores, and differential extracted
   - Faint events parsed

### Test End-to-End Flow

1. **Create test match**:
   ```sql
   INSERT INTO matches (
     team1_id, team2_id, week, status, showdown_room_id
   ) VALUES (
     '<team1-uuid>', '<team2-uuid>', 1, 'in_progress', 'battle-gen9avgatbest-123456'
   );
   ```

2. **Start worker**:
   ```bash
   pnpm dev
   ```

3. **Complete battle** in Showdown room

4. **Verify**:
   - Match status updated to `completed`
   - Winner, scores, differential recorded
   - Standings recalculated
   - Discord notification sent (if configured)

---

## Troubleshooting

### WebSocket Connection Fails

**Symptoms**: `WebSocket error` or connection timeout  
**Solutions**:
1. Verify `SHOWDOWN_SERVER_URL` is correct
2. Check Showdown server is running
3. Verify network connectivity
4. Check firewall rules

### Supabase Connection Fails

**Symptoms**: `Missing required environment variables`  
**Solutions**:
1. Verify `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are set
2. Check service role key is valid
3. Verify Supabase project is accessible

### Room Manager Not Finding Rooms

**Symptoms**: "No active rooms to monitor"  
**Solutions**:
1. Verify matches exist with `status='in_progress'`
2. Verify matches have `showdown_room_id` set
3. Check database permissions
4. Verify RLS policies allow service role access

### Replay Parser Fails

**Symptoms**: `Failed to fetch replay`  
**Solutions**:
1. Verify room ID format is correct
2. Check replay exists on Showdown server
3. Try different format prefixes (gen9avgatbest, gen9ou, etc.)
4. Verify room has completed battle

---

## Test Coverage

### ✅ Covered

- WebSocket connection and reconnection
- Room subscription/unsubscription
- Supabase database queries
- Component initialization
- Error handling
- Graceful shutdown

### ⏳ Not Yet Tested (Require Real Data)

- Replay parsing with real battle data
- Match record updates
- Standings recalculation
- Discord webhook posting
- Full battle completion flow

---

## Next Steps

1. ✅ **Core Tests** - Complete
2. ⏳ **Deploy to Server** - Ready for deployment
3. ⏳ **Validate with Real Battles** - Test with actual matches
4. ⏳ **Monitor Production** - Watch logs for issues

---

**Last Updated**: January 15, 2026
