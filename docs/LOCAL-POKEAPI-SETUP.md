# Local PokeAPI Setup Guide

**Date**: 2026-01-13  
**Status**: Configured and Verified

---

## Overview

This guide explains how to use a local PokeAPI instance for development and testing, reducing dependency on the public API and enabling faster development.

---

## Prerequisites

- Docker and Docker Compose installed
- Local PokeAPI instance running (see `temp/pokeapi-local-setup-complete.md`)

---

## Configuration

### Environment Variables

Add to `.env.local`:

\`\`\`env
# Local PokeAPI instance
POKEAPI_BASE_URL=http://localhost/api/v2
\`\`\`

For Edge Functions, set the secret:

\`\`\`bash
supabase secrets set POKEAPI_BASE_URL=http://localhost/api/v2
\`\`\`

---

## Usage

### Scripts

All scripts that use PokeAPI will automatically use the local instance when `POKEAPI_BASE_URL` is set:

\`\`\`bash
# Test configuration
pnpm tsx --env-file=.env.local scripts/test-local-pokeapi.ts

# Run sync scripts
pn,pm tsx --env-file=.env.local scripts/sync-pokemon-from-api.ts
\`\`\`

### Edge Functions

Edge Functions will use the local instance if `POKEAPI_BASE_URL` is set as a secret:

\`\`\`bash
# Set secret for Edge Functions
supabase secrets set POKEAPI_BASE_URL=http://localhost/api/v2

# Deploy Edge Functions
supabase functions deploy sync-pokepedia
\`\`\`

---

## Verification

### Test Local API

\`\`\`bash
# Test API endpoint
curl http://localhost/api/v2/pokemon/1/

# Test list endpoint
curl "http://localhost/api/v2/pokemon/?limit=5"
\`\`\`

### Test Configuration

\`\`\`bash
pnpm tsx --env-file=.env.local scripts/test-local-pokeapi.ts
\`\`\`

---

## Benefits

1. **No Rate Limits**: Local instance has no rate limits
2. **Faster Development**: No network latency
3. **Offline Development**: Works without internet
4. **Data Control**: Full control over the data
5. **Testing**: Test sync scripts without affecting production API

---

## Switching Between Local and Production

### Use Local Instance

\`\`\`env
POKEAPI_BASE_URL=http://localhost/api/v2
\`\`\`

### Use Production Instance

\`\`\`env
POKEAPI_BASE_URL=https://pokeapi.co/api/v2
\`\`\`

Or remove the variable to use the default.

---

## Troubleshooting

### API Not Accessible

1. Check containers are running:
   \`\`\`bash
   cd tools/pokeapi-local
   docker compose ps
   \`\`\`

2. Check port 80 is accessible:
   \`\`\`bash
   curl http://localhost/api/v2/
   \`\`\`

3. Verify environment variable:
   \`\`\`bash
   echo $POKEAPI_BEST_URL
   \`\`\`

### Edge Functions Not Using Local Instance

1. Verify secret is set:
   \`\`\`bash
   supabase secrets list
   \`\`\`

2. Redeploy Edge Functions:
   \`\`\`bash
   supabase functions deploy sync-pokepedia
   \`\`\`

---

## Notes

- Local instance runs on port 80
- GraphQL is available on port 8080
- Data persists in Docker volumes
- Database credentials:
  - User: `ash`
  - Password: `pokemon`
  - Database: `pokeapi`

---

**Status**: ✅ Configured and Verified
