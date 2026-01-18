# Vercel Environment Variables - New Variables Added

**Date**: January 18, 2026  
**Status**: ✅ **COMPLETE**  
**Purpose**: Document new production environment variables added to Vercel

---

## 📋 Summary

Successfully added **7 new environment variables** to Vercel production environment from the Server Agent handoff document (`ENV-HANDOFF-APP-AGENT.md`).

---

## ✅ Variables Added

### 1. Supabase MCP OAuth (Machine-to-Machine)
- **`SUPABASE_MCP_OAUTH_CLIENT_ID`** ✅ Added
  - Value: `e0dc2857-914c-4473-a992-9476240ac93c`
  - Use case: OAuth client ID for MCP Server authentication via Supabase OAuth Server
  - Environment: Production

- **`SUPABASE_MCP_OAUTH_CLIENT_SECRET`** ✅ Added
  - Value: `DTel1NSQ3lA4pS_aMqutnhEgMetH43AjKuWHwBGKprg`
  - Use case: OAuth client secret for MCP Server (client_credentials grant)
  - Environment: Production
  - ⚠️ **CRITICAL**: Server-side only, never expose to client-side

### 2. OAuth JWT Secret
- **`OAUTH_JWT_SECRET`** ✅ Added
  - Value: `***REMOVED***`
  - Use case: JWT secret for OAuth token signing/verification
  - Environment: Production
  - Note: Defaults to MCP_API_KEY if not set

### 3. Supabase OAuth (OpenWebUI Integration)
- **`SUPABASE_OAUTH_CLIENT_ID`** ✅ Added
  - Value: `8719038a-d69d-4c98-99cd-53283b3a3bb8`
  - Use case: OAuth client ID for OpenWebUI Discord authentication
  - Environment: Production

- **`SUPABASE_OAUTH_CLIENT_SECRET`** ✅ Added
  - Value: `***REMOVED***`
  - Use case: OAuth client secret for OpenWebUI (authorization_code grant)
  - Environment: Production
  - ⚠️ **CRITICAL**: Server-side only, never expose to client-side

### 4. MCP Server Configuration
- **`MCP_API_KEY`** ✅ Added
  - Value: `***REMOVED***`
  - Use case: API key for MCP Server authentication (legacy, backward compatibility)
  - Environment: Production
  - Format: `mnky_<64-character-hex-string>`
  - Note: OAuth is preferred for new integrations, but API key still supported

- **`MCP_DRAFT_POOL_URL`** ✅ Added
  - Value: `https://mcp-draft-pool.moodmnky.com`
  - Use case: Public URL for Draft Pool MCP Server
  - Environment: Production
  - Note: Uses public URL (not internal Docker URL) since Vercel is external

---

## 🔍 Verification

All variables were successfully added using Vercel CLI:

```bash
vercel env add <VARIABLE_NAME> production
```

**Project**: `poke-mnky-v2`  
**Team**: `mood-mnkys-projects`  
**Environment**: Production

---

## 📝 Notes

### Variable Sources
- All values sourced from `ENV-HANDOFF-APP-AGENT.md`
- Values match Server Agent's production `.env` file
- Variables marked as "New Variables (Recently Added)" in handoff document

### Security
- All secrets are encrypted in Vercel
- Server-side only variables are properly secured
- Never expose secrets to client-side code

### URL Configuration
- `MCP_DRAFT_POOL_URL` uses public URL (`https://mcp-draft-pool.moodmnky.com`)
- Internal Docker URL (`http://draft-pool-mcp-server:3000`) is for server-side services only
- Vercel requires public URLs for external API calls

---

## 🔄 Next Steps

1. ✅ Variables added to Vercel production
2. ⏳ Next deployment will include these variables
3. ⏳ Test MCP Server integration with new OAuth credentials
4. ⏳ Verify OpenWebUI OAuth flow with new credentials

---

## 📚 Related Documentation

- **Handoff Document**: `ENV-HANDOFF-APP-AGENT.md`
- **MCP Server Integration**: `MCP-SERVER-INTEGRATION-GUIDE.md`
- **Supabase OAuth Setup**: `docs/SUPABASE-OAUTH-APP-CREATION.md`

---

**Last Updated**: January 18, 2026  
**Added By**: App Agent  
**Status**: ✅ **COMPLETE**

---

## 🚀 Deployment

**Deployment Triggered**: January 18, 2026  
**Purpose**: Pick up new environment variables in Vercel production  
**Status**: Variables available in next deployment
