# MCP Server Network Configuration

**Date**: January 17, 2026  
**Critical**: ⚠️ **MUST USE NETWORK IP FOR LOCAL TESTING**

---

## ⚠️ Critical Configuration

### For Local Testing

**MCP Server URL MUST use network IP, NOT localhost:**

```bash
# ✅ CORRECT (for local testing)
MCP_DRAFT_POOL_SERVER_URL=http://10.3.0.119:3001/mcp

# ❌ WRONG (will fail)
MCP_DRAFT_POOL_SERVER_URL=http://localhost:3001/mcp
MCP_DRAFT_POOL_SERVER_URL=http://127.0.0.1:3001/mcp
```

### Why?

- **MCP Server** runs on remote server (`10.3.0.119`)
- **Next.js App** runs locally (`localhost:3000`)
- **Local app** cannot access `localhost:3001` on remote server
- **Must use network IP** (`10.3.0.119:3001`) for cross-machine access

---

## Configuration Files

### `.env.local` (Local Development)

```bash
# ✅ CORRECT
MCP_DRAFT_POOL_SERVER_URL=http://10.3.0.119:3001/mcp
ENABLE_RESPONSES_API=false
```

### `.env` (Production)

```bash
# ✅ CORRECT (Cloudflare Tunnel)
MCP_DRAFT_POOL_SERVER_URL=https://mcp-draft-pool.moodmnky.com/mcp
ENABLE_RESPONSES_API=false
```

---

## Verification

### Check Configuration

```bash
# Check .env.local
cat .env.local | grep MCP_DRAFT_POOL_SERVER_URL
# Should show: http://10.3.0.119:3001/mcp

# Check .env
cat .env | grep MCP_DRAFT_POOL_SERVER_URL
# Should show: https://mcp-draft-pool.moodmnky.com/mcp
```

### Test Connection

```bash
# Test health endpoint (should work)
curl http://10.3.0.119:3001/health
# Expected: {"status":"ok","service":"poke-mnky-draft-pool-mcp-server"}

# Test from localhost (should fail)
curl http://localhost:3001/health
# Expected: Connection refused or timeout
```

---

## Code Verification

### In `app/api/ai/pokedex/route.ts`

```typescript
// ✅ CORRECT - Uses environment variable with network IP fallback
const mcpServerUrl = process.env.MCP_DRAFT_POOL_SERVER_URL || "http://10.3.0.119:3001/mcp"
```

### In `scripts/test-mcp-end-to-end.ts`

```typescript
// ✅ CORRECT - Uses network IP
const MCP_SERVER_URL = process.env.MCP_DRAFT_POOL_SERVER_URL || 'http://10.3.0.119:3001/mcp'
```

---

## Troubleshooting

### Issue: Connection Refused

**Symptom**: `fetch failed` or `ECONNREFUSED`

**Cause**: Using `localhost` instead of network IP

**Fix**: 
```bash
# Update .env.local
MCP_DRAFT_POOL_SERVER_URL=http://10.3.0.119:3001/mcp
```

### Issue: Timeout

**Symptom**: Request times out

**Cause**: Network connectivity issue or firewall

**Fix**: 
1. Verify server is accessible: `ping 10.3.0.119`
2. Verify port is open: `telnet 10.3.0.119 3001`
3. Check firewall rules

---

## Network Architecture

```
┌─────────────────────┐
│  Local Machine      │
│  (localhost:3000)   │
│                     │
│  Next.js App        │
└──────────┬──────────┘
           │ HTTP Request
           │ (uses network IP)
           ▼
┌─────────────────────┐
│  Remote Server      │
│  (10.3.0.119)       │
│                     │
│  MCP Server         │
│  (port 3001)        │
└─────────────────────┘
```

**Key Point**: Local app → Remote server requires network IP, not localhost.

---

## Summary

✅ **Always use network IP** (`10.3.0.119`) for local testing  
✅ **Use Cloudflare Tunnel URL** for production  
❌ **Never use localhost** when accessing remote server from local machine

---

**Status**: ✅ **CONFIGURATION VERIFIED**
