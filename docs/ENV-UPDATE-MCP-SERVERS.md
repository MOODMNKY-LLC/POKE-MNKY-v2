# Environment Variables Update - MCP Servers

**Date**: January 17, 2026  
**Status**: ✅ Complete

---

## Updates Applied

### `.env` (Production)

Added MCP server configuration section:

```bash
# -----------------------------------------------------------------------------
# MCP Server Configuration (OpenAI Responses API Integration)
# -----------------------------------------------------------------------------
# Draft Pool MCP Server - Cloudflare Tunnel URL (Production)
MCP_DRAFT_POOL_SERVER_URL=https://mcp-draft-pool.moodmnky.com/mcp
# Enable Responses API globally (optional)
ENABLE_RESPONSES_API=false
```

### `.env.local` (Local Development)

Added MCP server configuration section:

```bash
# -----------------------------------------------------------------------------
# MCP Server Configuration (Local Development)
# -----------------------------------------------------------------------------
# Draft Pool MCP Server - Network IP (for local dev)
MCP_DRAFT_POOL_SERVER_URL=http://10.3.0.119:3001/mcp
# Enable Responses API globally (optional)
ENABLE_RESPONSES_API=false
```

---

## MCP Server URLs

### Production (Cloudflare Tunnel)
- **URL**: `https://mcp-draft-pool.moodmnky.com/mcp`
- **Status**: ✅ Verified and Operational
- **DNS**: Resolves to Cloudflare IPs
- **SSL/TLS**: Valid certificate
- **Use**: For Vercel production deployments

### Local/Network (Direct IP)
- **URL**: `http://10.3.0.119:3001/mcp`
- **Status**: ✅ Running and Healthy
- **Use**: For local development and internal network access

---

## Usage

### Enable Responses API Per-Request

```typescript
POST /api/ai/pokedex
{
  "query": "What Pokémon are available?",
  "useResponsesAPI": true
}
```

### Enable Responses API Globally

Set in environment variables:
```bash
ENABLE_RESPONSES_API=true
```

---

## Verification

✅ `.env` updated with production MCP URL  
✅ `.env.local` updated with network IP MCP URL  
✅ Both files include `ENABLE_RESPONSES_API` flag  
✅ Documentation updated

---

**Status**: Complete  
**Next**: Test Responses API integration with MCP tools
