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
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNobXJzenJ3bGZlcW92d3h5cm10Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjgxOTk0MTMsImV4cCI6MjA4Mzc3NTQxM30.z2LyP9rcQF0avvryv-5P3QzIYKCrVIWTnui7zS7Tpy0
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNobXJzenJ3bGZlcW92d3h5cm10Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2ODE5OTQxMywiZXhwIjoyMDgzNzc1NDEzfQ.uTi9Re3MetIiwgtaS51JIbI1Oay1UCKy5aHmYz1QDHY
NEXT_PUBLIC_SUPABASE_PROJECT_REF=chmrszrwlfeqovwxyrmt

# -----------------------------------------------------------------------------
# Discord Integration (Production)
# -----------------------------------------------------------------------------
DISCORD_CLIENT_ID=1455442114174386272
DISCORD_PUBLIC_KEY=bed1d73f9643f9532519c5a2049428dde7913c735e317bff8dd1f1b3d3f8c758
DISCORD_BOT_TOKEN=your-discord-bot-token-here
DISCORD_CLIENT_SECRET=3X3jnySD1W6bBJ9Y2HA2qhA_ZwEyo-Tj
DISCORD_GUILD_ID=1190512330556063764
DISCORD_GUILD_IDS=1069695816001933332,1190512330556063764

# -----------------------------------------------------------------------------
# Showdown Server Configuration (Production)
# -----------------------------------------------------------------------------
SHOWDOWN_SERVER_URL=https://aab-showdown.moodmnky.com
NEXT_PUBLIC_SHOWDOWN_CLIENT_URL=https://aab-play.moodmnky.com
SHOWDOWN_API_KEY=5828714b68d1b1251425aba63d28edb164fa3f42e9523fbff8c5979107317750
SHOWDOWN_PUBLIC_URL=https://aab-play.moodmnky.com
SHOWDOWN_COOKIE_DOMAIN=moodmnky.com

# -----------------------------------------------------------------------------
# Loginserver Configuration (Production)
# -----------------------------------------------------------------------------
LOGINSERVER_PRIVATE_KEY=-----BEGIN PRIVATE KEY-----
MIIEuwIBADANBgkqhkiG9w0BAQEFAASCBKUwggShAgEAAoIBAQCgEfZclWrlOPak
mfDtNeucbiLruc6nw7O4x73pc6ThektlGdk58LYg3MucwaDnTDvH2YfTocQoQnvY
e4nz0jKoSrhhZpUoJvG9TRv/z6wBajI0hFI2bXUkRdLKrLJmo7hV2dCsXjMXaP6b
aXs9LvpCs238R1/zjha4rrh9M0ayeVv1Od4D/nJfk8em+037pU+Uq/43mpSt+e4g
3Mva+bivLT6w5n7fMDpafYnhkzjqTWBpTSECGdERmBFzspqcSHUfiAks4OiT/cRy
D7K4HcCKyzgsxyYu6pu1+nXA5xIsGH4gbMs9hP7xjco7TEqWKrRvDeG3aGiQrPkY
2xdja8rfAgMBAAECgf85p+eaupt0XgAF85w7m4DS4UGZuHiF3X4p+OIejRU0VFjc
s0OWUs7UOlZwMpF/RNRQ2PaL65R0l82T6TnbVpRDTSElhBJHcXFsUyNdnL+RfYt7
HjKw0xHhMQLaawjff2sUsTYSFeZr0gLokSVny0PXgn0JmzsD+cCVTkgLs/LDD71K
zbHP4BxE9gFq0i62aUF+OmqxI+xC8gzddXdyCi2BCuxCiVKY1w+ZdEKO6rYpPJTR
sTjaolrQXO82XwcfcRuIm7zMCOpDfEoNRu0ZmGJA2iBLX0bKYO32o3i2nb1qWZXP
YoF++5als6EXb3KYsZBV7R7QIVDRLB/69Dhh42kCgYEA3eHL2W2PRQ8iRxObKpGK
iIIyG4UXzf/AKoW2HeeKKi7Y5zmDKqDq3uqDoEDzuwQftiY0oVRwv4MC1gmjIw37
FPn6nAwwwQ8cB+7wqvX2vfnh5y3e5VpwfNkzjwcISalI8CN0PJltq41bwqnE48b0
MOphbOJlSeBcDWyxm3vd+T0CgYEAuK7+QpjHuHovY44UnEGxYi8/RjlszZ8qYJAG
Vvv/vHGk6nz6PPFO1/LxUWsw7KMftPTRHRrD/trxCxWcsYSU4wLXgzp9lr2z+zXY
iml4/JoS0aALAe6xWcxh4mOFzf/w6oErr1fImIdkrsIXEf5B2pjiFWECid6KpaJZ
nq2TPksCgYEAlIhzTjppjnFzIOGfHgAQHRILOSD/rodmvRCFub8mXta9nQyDIiZX
FKMpOj5A6xD3qZgp41YDpDCv1VjePLk/O+ucOJpwiMz0ltr9gXTmmIaPE5NBg4fn
haxhN34drjIFAby6M1cCc7VNmCLOCy1Eivpb/egQpkPrW5FH1C43ioECgYAZFUNZ
PjDaAFZRWim4cz+pSyt32TLK1pRF2ynRRJaePH0ej+zYvBluQQO/gCR770fOJvYD
0u/NvGTCkaPfhFdIYcltfFM0Vv2L3+tSGTMic7acm/UCxS13OcgNnGC+8sUAxJxv
Syfmd3UYOyow+mxtSRhjuPJEUWJZTqyHXaHC8wKBgExYfgJ8MsqEupM3No/g2X1h
aVGD/SLnX94Z35KE6lZewzNXiNrma0po1yLDC5eviIObNllpGmRqQfDl4st+wJ5t
xjtlyeOBeivPB9fSRnIZsdioH4rXwOBSLmdqBE0FB/m7WB3goRVP9d/PGCslXOtr
tsRF22bUU4niJBJFfpAO
-----END PRIVATE KEY-----

# -----------------------------------------------------------------------------
# MinIO Configuration (Production - External URLs)
# -----------------------------------------------------------------------------
MINIO_ENDPOINT_EXTERNAL=https://s3-api-data.moodmnky.com
MINIO_CONSOLE_EXTERNAL=https://s3-console-data.moodmnky.com
MINIO_ACCESS_KEY=jp3O2FaYMWDsK03OeMPQ
MINIO_SECRET_KEY=n9MtRoKbBtPqUFdGRxD8FbsICQdOQabzq1RemJgf
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
ENCRYPTION_KEY=4e4f72bb64d4081884d35cdacea3ff14a23c9dfe9e8477ca649acf6b3d3a314c
GOOGLE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nMIIEvgIBADANBgkqhkiG9w0BAQEFAASCBKgwggSkAgEAAoIBAQCwd6wwTMfjHYOM\nEIvrmssk+Bw6TWnk7x+VI+eYn4iZ5GCbF6ZES3jtF2fFwCOAGm5Hzdl0umZIVoE7\nr1zFHoy5QcB9kxcGuEK/9t2feXnwTu/5oNAuzOcsu+1LbAkm1MdM/v2a1jtrNzNr\nrkARPyn15dTV5+V7Avq2RumrBZq8YzYA1FI6SqNNKi1uVKKrKjBv8CO0utwNivi9\nvnFwxjW+aIxHtzE+JcTMaGDpvuak9GsvlL9HzbxbSO2HsZEZ22XhVA/9TENUYewe\npr0NfdUYTGjbaAsw9G1A6FNW9eCMxqstd0BHcukfrVucMYfhomFe6RPn1kLgU31w\nD2hNbfHjAgMBAAECggEAGISQCmfoj8AOglvcLOBlYB4OwfT2hQXKNAz4hQaJUqRd\n3b6D7dI0m3BYjSucYxSJBPXvRB4PzvYh33qGX6bWc3jUtz3EAb2BHK2+bgVRMVeu\nVNcIhbAXYGo91nBMtzXx+NsmvigMumFBhjEAGsVVXaJQl2WwRw6Lad7hYU8WiBzf\nh8c8kuU4ldxHk0BHtvvKLIk+djQ1ALBzdZsOYIl5WcYr6kNUBnbl1wjHxbzTlv8U\nnFwF9MorlKRTyh+mRO7kw3jYFmy5wPFmoWMw2dJQfDl4st+wJ5t\nxjtlyeOBeivPB9fSRnIZsdioH4rXwOBSLmdqBE0FB/m7WB3goRVP9d/PGCslXOtr\ntsRF22bUU4niJBJFfpAO\n-----END PRIVATE KEY-----\n"
GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nMIIEvwIBADANBgkqhkiG9w0BAQEFAASCBKkwggSlAgEAAoIBAQC9+0HRkoJf2Fw+\n7Oa0PATLAUXdTCTB/39exY1vnkvD7+sJdgF94O/PDEo0dl8VUvmcXqUK3UoD3hit\n2RtoDl/08GfxfxPyWEM4qMZo3OVogoP2dnNoEvHwrqmd7UIdfA77LrmpNv1H5ZQ4\nRblwo+tOrqyjszBbYDjPwOlsIATmiB7HPf5jndOd7o9LZgYQpAmftIDFJIRONMuE\npXoPIBWdrWtzu0MhA4tG1NW6qP9YDj0P9XGIlZ11FFcxQvJ8lFeMuHM4oZ4hmm7/\nKuou5ibRkvFMmJmdll0Koct6eGJba4zKFonr+XYCmfGJyH/dstebqp+/kbHoiA1a\n/ZJC2gEJAgMBAAECggEAGorTfRhMfwqHMhgT+q4AohdumjE3WM6S43vokOXF7RKE\nZ7Z6aoqgxnBk9PkYEK5z3DJm5DfazY6GgSdkylVpIkXs0mhwMiVoWC6lmw9IPSEw\nQaChQAhBkArpp1GiBo+HYkrQD+xJrPVOD3dCUL0+Cf33ywklDOcfw3rOwddOsqGn\np8cEJnW5BoxgCuk2pXr1Y6GPqbWAi7/GticLZX7p90TtseOU8CXRZ7QPV0On2IuP\nNpTS29ox4S40VV9MtTKOG8O6e70rhC4A/F37di7KdaTywykOjJshZx4PS6f3dsnC\nelwVBGWEm0hshSpqTC8fvZk1syVxF7Ktpc2CWnElfwKBgQDyNQ/M6/kFT8eWy4+I\nuxkMBMJjE1aMfkL75H83OXoSn+XmLO8YEXhZViMOYFK33u1yAtU9neJHxXOesBIP\nAuFF33OYbeKNDfU7Y8tWqNHZVnNgjntTNob05c/ScYPn1dx6MyHLPcMTLCjJsXuj\nC6+OhHbg6klHmn8Yy8GJ8E0z3wKBgQDIzNbDCcIJqPK7GiD1I5TWAfonx8Hfhvr9\n+rwun59YLs8YC2/WY43kRMhz1YQ3yEnGNwy7FyZPk2VZSE8H9446kVQFMqS7MdOq\nUjDWd7l2rRbSR+Xu24Ki2yhm7qp57p53UavUl4XB/k50T6RDrgptMtFnfNbIMDCv\nZLVsOiCoFwKBgQDr67uEQ6XAAsHKpGUfLf9rsYcWslNvbd0ZNqyjwhyh35Yz6jjK\nHNo5SqnC6xgnecGXeCL1bcBnYHEKdT5h2NBNGyahpwcxlhL00nPR6YbeSFMCDkcZ\n+tbh3KfduCxfufSUIxIbwgEtv6nLLFHdsxhBnc2drxfJ4zdBk9bk4WiRyQKBgQCX\n9t35kSL2KJQ6oVWb8CetpqVpAbZpsj+1gtJz/n2bQSGdstoayBEUVjHV6Bs+FCgx\nCGxsEuL9ijFDVoPpJaLQFDggDum4eccUuUsYpFcJx4jj72HGWP4OvglfjPQbf0kS\nSA7gvyONYyaAw90vE0H0zmbICSSLMF1H/9GFbKBWVQKBgQDicgJOAR5aE717TU4g\nbwYpd8nhoBasqsvjnyEh0ew+NJDc4GutloNFXyv9HHqeuPSfwmcnCJXupXBWsMjG\ns0k/ju+Ic6GCbkjCMLzxuaWrwMXLKSdgnEO5fPQ2o67zQR3dFX+7kR48uNUvZJHj\n6YwyWXlwpB76ZOJNUfizBFXHww==\n-----END PRIVATE KEY-----\n"

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
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJFUzI1NiIsImtpZCI6ImI4MTI2OWYxLTIxZDgtNGYyZS1iNzE5LWMyMjQwYTg0MGQ5MCIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MjA4Mzc3MjIyNH0.wKntB-qJcY3dQnnyGgh3biGiwUIxY4BrMijXdMt5xn5AcFNWK7Bl18rBOmXTlxssNZw8iIZi8xBXExHrZkGcVQ

# Legacy Keys (for compatibility)
SUPABASE_PUBLISHABLE_KEY=sb_publishable_ACJWlzQHlZjBrEguHvfOxg_3BJgxAaH
SUPABASE_SECRET_KEY=sb_secret_N7UND0UgjKTVK-Uodkm0Hg_xSvEMPvz

# JWT Secret (for signing/verifying tokens)
SUPABASE_JWT_SECRET=super-secret-jwt-token-with-at-least-32-characters-long
JWT_SECRET=super-secret-jwt-token-with-at-least-32-characters-long

# Storage Configuration (Local)
SUPABASE_STORAGE_ACCESS_KEY=625729a08b95bf1b7ff351a663f3a23c
SUPABASE_STORAGE_SECRET_KEY=850181e4652dd023b7a98c58ae0d2d34bd487ee0cc3254aed6eda37307425907
SUPABASE_STORAGE_REGION=local

# Supabase Platform Kit (Local)
NEXT_PUBLIC_SUPABASE_PROJECT_REF=coevjitstmuhdhbyizpk
SUPABASE_MANAGEMENT_API_TOKEN=sbp_810ec88f472beddfca3037ab970f716e93d31bf3
NEXT_PUBLIC_ENABLE_AI_QUERIES=true

# -----------------------------------------------------------------------------
# MinIO Configuration (Local Development - Internal IPs)
# -----------------------------------------------------------------------------
# Internal MinIO endpoints for local development
MINIO_ENDPOINT_INTERNAL=http://10.0.0.5:30090
MINIO_CONSOLE_INTERNAL=http://10.0.0.5:30212
MINIO_ACCESS_KEY=jp3O2FaYMWDsK03OeMPQ
MINIO_SECRET_KEY=n9MtRoKbBtPqUFdGRxD8FbsICQdOQabzq1RemJgf
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
# SUPABASE_AUTH_EXTERNAL_GOOGLE_SECRET=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
# ENCRYPTION_KEY=4e4f72bb64d4081884d35cdacea3ff14a23c9dfe9e8477ca649acf6b3d3a314c
# GOOGLE_PRIVATE_KEY="..."
# GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY="..."

# -----------------------------------------------------------------------------
# Discord Integration (Shared - Same as Production)
# -----------------------------------------------------------------------------
# These are the same as production - no need to override locally
# DISCORD_CLIENT_ID=1455442114174386272
# DISCORD_PUBLIC_KEY=bed1d73f9643f9532519c5a2049428dde7913c735e317bff8dd1f1b3d3f8c758
# DISCORD_BOT_TOKEN=your-discord-bot-token-here
# DISCORD_CLIENT_SECRET=3X3jnySD1W6bBJ9Y2HA2qhA_ZwEyo-Tj
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
