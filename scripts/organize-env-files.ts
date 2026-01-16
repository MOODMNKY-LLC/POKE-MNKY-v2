/**
 * Organize .env and .env.local files
 * 
 * .env = Production values (from Vercel)
 * .env.local = Local development overrides
 */

import { readFileSync, writeFileSync, existsSync } from 'fs'

// Production variables from Vercel (what should be in .env)
const productionTemplate = `# =============================================================================
# POKE MNKY - Production Environment Variables
# =============================================================================
# This file contains production configuration pulled from Vercel
# Used by: Production deployments, Preview deployments
# Source: vercel env pull .env
# =============================================================================
# 
# NOTE: This file is auto-generated from Vercel. Do not edit manually.
# To update: Run 'vercel env pull .env' or update variables in Vercel dashboard
# =============================================================================

# -----------------------------------------------------------------------------
# Application URLs (Production)
# -----------------------------------------------------------------------------
APP_URL=https://poke-mnky.moodmnky.com
NEXT_PUBLIC_APP_URL=https://poke-mnky.moodmnky.com

# -----------------------------------------------------------------------------
# Supabase Configuration (Production)
# -----------------------------------------------------------------------------
NEXT_PUBLIC_SUPABASE_URL=https://chmrszrwlfeqovwxyrmt.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=***REMOVED***
SUPABASE_SERVICE_ROLE_KEY=***REMOVED***
NEXT_PUBLIC_SUPABASE_PROJECT_REF=chmrszrwlfeqovwxyrmt

# -----------------------------------------------------------------------------
# Discord Integration (Production)
# -----------------------------------------------------------------------------
DISCORD_CLIENT_ID=1455442114174386272
DISCORD_PUBLIC_KEY=bed1d73f9643f9532519c5a2049428dde7913c735e317bff8dd1f1b3d3f8c758
DISCORD_BOT_TOKEN=your-discord-bot-token-here
DISCORD_CLIENT_SECRET=***REMOVED***
DISCORD_GUILD_ID=1190512330556063764
DISCORD_GUILD_IDS=1069695816001933332,1190512330556063764

# -----------------------------------------------------------------------------
# Showdown Server Configuration (Production)
# -----------------------------------------------------------------------------
SHOWDOWN_SERVER_URL=https://aab-showdown.moodmnky.com
NEXT_PUBLIC_SHOWDOWN_CLIENT_URL=https://aab-play.moodmnky.com
SHOWDOWN_API_KEY=***REMOVED***
SHOWDOWN_PUBLIC_URL=https://aab-play.moodmnky.com
SHOWDOWN_COOKIE_DOMAIN=moodmnky.com

# -----------------------------------------------------------------------------
# Loginserver Configuration (Production)
# -----------------------------------------------------------------------------
LOGINSERVER_PRIVATE_KEY=***REMOVED***

# -----------------------------------------------------------------------------
# MinIO Configuration (Production - External URLs)
# -----------------------------------------------------------------------------
MINIO_ENDPOINT_EXTERNAL=https://s3-api-data.moodmnky.com
MINIO_CONSOLE_EXTERNAL=https://s3-console-data.moodmnky.com
MINIO_ACCESS_KEY=***REMOVED***
MINIO_SECRET_KEY=***REMOVED***
MINIO_BUCKET_NAME=pokedex-sprites
MINIO_REGION=us-east-1
MINIO_SERVER_LOCATION=us-east-1
SPRITES_BASE_URL=https://s3-api-data.moodmnky.com/pokedex-sprites
NEXT_PUBLIC_SPRITES_BASE_URL=https://s3-api-data.moodmnky.com/pokedex-sprites

# -----------------------------------------------------------------------------
# PokéAPI Configuration (Production)
# -----------------------------------------------------------------------------
POKEAPI_BASE_URL=https://pokeapi.co/api/v2
NEXT_PUBLIC_POKEAPI_BASE_URL=https://pokeapi.co/api/v2

# -----------------------------------------------------------------------------
# Google Sheets Configuration (Shared)
# -----------------------------------------------------------------------------
GOOGLE_SHEET_ID=1sVQD6_CsoYtGmguRhc07IDlnz2V4Q2uWTt8Owpl5JE0
GOOGLE_SERVICE_ACCOUNT_EMAIL=poke-mnky-service@mood-mnky.iam.gserviceaccount.com
GOOGLE_CLIENT_ID=your-google-client-id-here
GOOGLE_CLIENT_SECRET=your-google-client-secret-here
SUPABASE_AUTH_EXTERNAL_GOOGLE_SECRET=your-google-client-secret-here
ENCRYPTION_KEY=***REMOVED***
GOOGLE_PRIVATE_KEY="***REMOVED***\n"
GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY="***REMOVED***\n"

# -----------------------------------------------------------------------------
# OpenAI API (Shared)
# -----------------------------------------------------------------------------
OPENAI_API_KEY=your-openai-api-key-here

# -----------------------------------------------------------------------------
# Vercel KV (Redis Cache)
# -----------------------------------------------------------------------------
KV_URL=
KV_REST_API_TOKEN=
KV_REST_API_URL=
KV_REST_API_READ_ONLY_TOKEN=

# -----------------------------------------------------------------------------
# Supabase Platform Kit
# -----------------------------------------------------------------------------
NEXT_PUBLIC_ENABLE_AI_QUERIES=true
SUPABASE_MANAGEMENT_API_TOKEN=
SUPABASE_ANON_KEY=
SUPABASE_PUBLISHABLE_KEY=
SUPABASE_SECRET_KEY=
SUPABASE_JWT_SECRET=
SUPABASE_URL=
`

// Local development template (what should be in .env.local)
const localDevTemplate = `# =============================================================================
# POKE MNKY - Local Development Environment Variables
# =============================================================================
# This file contains local development overrides
# Used by: Next.js development server (npm run dev)
# Precedence: .env.local overrides .env
# =============================================================================
# 
# NOTE: This file is for LOCAL DEVELOPMENT ONLY
# Do not commit production secrets or keys to this file
# =============================================================================

# -----------------------------------------------------------------------------
# Node Environment
# -----------------------------------------------------------------------------
NODE_ENV=development

# -----------------------------------------------------------------------------
# Application URLs (Local Development)
# -----------------------------------------------------------------------------
APP_URL=http://localhost:3000
NEXT_PUBLIC_APP_URL=http://localhost:3000

# -----------------------------------------------------------------------------
# Supabase Configuration (Local Development)
# -----------------------------------------------------------------------------
# Local Supabase instance running on 127.0.0.1:54321
# Generated from: npx supabase status --output json

# Base URLs
NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321
SUPABASE_STUDIO_URL=http://127.0.0.1:54323
SUPABASE_MAILPIT_URL=http://127.0.0.1:54324
SUPABASE_INBUCKET_URL=http://127.0.0.1:54324

# API Endpoints
SUPABASE_REST_URL=http://127.0.0.1:54321/rest/v1
SUPABASE_GRAPHQL_URL=http://127.0.0.1:54321/graphql/v1
SUPABASE_FUNCTIONS_URL=http://127.0.0.1:54321/functions/v1
SUPABASE_STORAGE_URL=http://127.0.0.1:54321/storage/v1
SUPABASE_MCP_URL=http://127.0.0.1:54321/mcp

# Database Connection
SUPABASE_DB_URL=postgresql://postgres:postgres@127.0.0.1:54322/postgres
DB_URL=postgresql://postgres:postgres@127.0.0.1:54322/postgres

# Authentication Keys (Local Supabase JWT Tokens)
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJFUzI1NiIsImtpZCI6ImI4MTI2OWYxLTIxZDgtNGYyZS1iNzE5LWMyMjQwYTg0MGQ5MCIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjIwODM3NzIyMjR9.xzrMwjtbusHRe8VFyjrJ64HQdADSOMyFthe79W-BIrR5VE9MyW0D9l5HdH2FVV5XlfiQYnn_3fWDgjbPHakC2A
SUPABASE_ANON_KEY=eyJhbGciOiJFUzI1NiIsImtpZCI6ImI4MTI2OWYxLTIxZDgtNGYyZS1iNzE5LWMyMjQwYTg0MGQ5MCIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjIwODM3NzIyMjR9.xzrMwjtbusHRe8VFyjrJ64HQdADSOMyFthe79W-BIrR5VE9MyW0D9l5HdH2FVV5XlfiQYnn_3fWDgjbPHakC2A
SUPABASE_SERVICE_ROLE_KEY=***REMOVED***

# Legacy Keys (for compatibility)
SUPABASE_PUBLISHABLE_KEY=sb_publishable_ACJWlzQHlZjBrEguHvfOxg_3BJgxAaH
SUPABASE_SECRET_KEY=***REMOVED***

# JWT Secret (for signing/verifying tokens)
SUPABASE_JWT_SECRET=super-secret-jwt-token-with-at-least-32-characters-long
JWT_SECRET=super-secret-jwt-token-with-at-least-32-characters-long

# Storage Configuration (Local)
SUPABASE_STORAGE_ACCESS_KEY=***REMOVED***
SUPABASE_STORAGE_SECRET_KEY=***REMOVED***
SUPABASE_STORAGE_REGION=local

# Supabase Platform Kit (Local)
NEXT_PUBLIC_SUPABASE_PROJECT_REF=coevjitstmuhdhbyizpk
SUPABASE_MANAGEMENT_API_TOKEN=***REMOVED***
NEXT_PUBLIC_ENABLE_AI_QUERIES=true

# -----------------------------------------------------------------------------
# MinIO Configuration (Local Development - Internal IPs)
# -----------------------------------------------------------------------------
# Internal MinIO endpoints for local development
MINIO_ENDPOINT_INTERNAL=http://10.0.0.5:30090
MINIO_CONSOLE_INTERNAL=http://10.0.0.5:30212
MINIO_ACCESS_KEY=***REMOVED***
MINIO_SECRET_KEY=***REMOVED***
MINIO_BUCKET_NAME=pokedex-sprites
MINIO_REGION=us-east-1
MINIO_SERVER_LOCATION=us-east-1

# Sprite URLs (Local)
SPRITES_BASE_URL=http://10.0.0.5:30090/pokedex-sprites
NEXT_PUBLIC_SPRITES_BASE_URL=http://10.0.0.5:30090/pokedex-sprites

# -----------------------------------------------------------------------------
# PokéAPI Configuration (Local Development)
# -----------------------------------------------------------------------------
# Local PokeAPI instance (if running locally)
POKEAPI_BASE_URL=http://localhost/api/v2
NEXT_PUBLIC_POKEAPI_BASE_URL=http://localhost/api/v2

# -----------------------------------------------------------------------------
# Showdown Server Configuration (Local Development)
# -----------------------------------------------------------------------------
# Note: These point to production Showdown server even in local dev
# Change if you're running Showdown locally
SHOWDOWN_SERVER_URL=https://aab-showdown.moodmnky.com
NEXT_PUBLIC_SHOWDOWN_CLIENT_URL=https://aab-play.moodmnky.com
SHOWDOWN_API_KEY=

# Showdown Loginserver Configuration (Local)
LOGINSERVER_URL=http://localhost:8001
SHOWDOWN_PASSWORD_SECRET=local-dev-secret-change-in-production

# -----------------------------------------------------------------------------
# Google OAuth Configuration (Shared - Same as Production)
# -----------------------------------------------------------------------------
# These are the same as production - no need to override locally
# GOOGLE_SHEET_ID=1sVQD6_CsoYtGmguRhc07IDlnz2V4Q2uWTt8Owpl5JE0
# GOOGLE_SERVICE_ACCOUNT_EMAIL=poke-mnky-service@mood-mnky.iam.gserviceaccount.com
# GOOGLE_CLIENT_ID=your-google-client-id-here
# GOOGLE_CLIENT_SECRET=your-google-client-secret-here
# SUPABASE_AUTH_EXTERNAL_GOOGLE_SECRET=***REMOVED***
# ENCRYPTION_KEY=***REMOVED***
# GOOGLE_PRIVATE_KEY="..."
# GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY="..."

# -----------------------------------------------------------------------------
# Discord Integration (Shared - Same as Production)
# -----------------------------------------------------------------------------
# These are the same as production - no need to override locally
# DISCORD_CLIENT_ID=1455442114174386272
# DISCORD_PUBLIC_KEY=bed1d73f9643f9532519c5a2049428dde7913c735e317bff8dd1f1b3d3f8c758
# DISCORD_BOT_TOKEN=your-discord-bot-token-here
# DISCORD_CLIENT_SECRET=***REMOVED***
# DISCORD_GUILD_ID=1190512330556063764
# DISCORD_GUILD_IDS=1069695816001933332,1190512330556063764

# -----------------------------------------------------------------------------
# OpenAI API (Shared - Same as Production)
# -----------------------------------------------------------------------------
# OPENAI_API_KEY=your-openai-api-key-here
`

function organizeEnvFiles() {
  console.log('📝 Organizing environment files...\n')
  
  // Read current .env if it exists (from Vercel pull)
  let currentEnv = ''
  if (existsSync('.env')) {
    currentEnv = readFileSync('.env', 'utf-8')
    console.log('✅ Read existing .env file')
  } else {
    console.log('⚠️  .env file not found - will create from template')
  }
  
  // Read current .env.local if it exists
  let currentEnvLocal = ''
  if (existsSync('.env.local')) {
    currentEnvLocal = readFileSync('.env.local', 'utf-8')
    console.log('✅ Read existing .env.local file')
  } else {
    console.log('⚠️  .env.local file not found - will create from template')
  }
  
  // Write organized .env (production)
  console.log('\n📝 Writing organized .env (production)...')
  writeFileSync('.env', productionTemplate, 'utf-8')
  console.log('✅ .env file organized')
  
  // Write organized .env.local (local dev)
  console.log('📝 Writing organized .env.local (local dev)...')
  writeFileSync('.env.local', localDevTemplate, 'utf-8')
  console.log('✅ .env.local file organized')
  
  console.log('\n✅ Environment files organized successfully!')
  console.log('\n📋 Summary:')
  console.log('  - .env: Production values (from Vercel)')
  console.log('  - .env.local: Local development overrides')
  console.log('  - .env.local takes precedence over .env')
}

organizeEnvFiles()
