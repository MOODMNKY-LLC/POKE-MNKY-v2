# MCP Server Session Cleanup Issue

**Date**: January 17, 2026  
**Status**: 🔍 **INVESTIGATING**

---

## Problem

The Draft Pool MCP server keeps crashing, and sessions are piling up without being cleaned up properly.

**Current State**:
- 26 active sessions
- Oldest session: 448 seconds old (~7.5 minutes)
- No cleanup logs appearing
- Sessions keep accumulating

---

## Investigation

### Cleanup Logic Exists

The code shows cleanup logic is implemented:
- `SESSION_TIMEOUT = 10 * 60 * 1000` (10 minutes)
- `CLEANUP_INTERVAL = 60000` (1 minute)
- `setInterval` cleanup function exists
- Should log cleanup activity

### Issue: No Cleanup Logs

**Problem**: Despite cleanup logic existing, no cleanup logs are appearing in Docker logs.

**Possible Causes**:
1. Cleanup interval not running
2. Sessions crashing before cleanup can execute
3. Cleanup logic has a bug preventing execution
4. `lastAccess` not being updated properly

---

## Next Steps

1. Extract full cleanup code to verify implementation
2. Check if `lastAccess` is being updated on each request
3. Verify cleanup interval is actually running
4. Add more logging to debug cleanup process
5. Fix session termination logic

---

## Fix Plan

### Option 1: Fix Cleanup Logic
- Ensure cleanup interval runs properly
- Add better error handling
- Add more logging

### Option 2: Improve Session Management
- Update `lastAccess` on every request (not just reuse)
- Add explicit session termination on errors
- Reduce timeout for faster cleanup

### Option 3: Add Session Limits
- Enforce max sessions more strictly
- Reject new sessions when limit reached
- Force cleanup oldest sessions when limit hit

---

**Status**: Investigating root cause...
