/**
 * Sync Production Environment Variables to Vercel
 * 
 * Reads .env.local and adds/updates production variables in Vercel
 * Filters out local-only variables (localhost, 127.0.0.1, etc.)
 */

import { readFileSync, existsSync } from 'fs'
import { execSync } from 'child_process'

interface EnvVar {
  key: string
  value: string
  environments: ('Production' | 'Preview' | 'Development')[]
}

// Variables to exclude (local-only)
const LOCAL_ONLY_PATTERNS = [
  /^NEXT_PUBLIC_APP_URL=.*localhost/,
  /^NEXT_PUBLIC_SUPABASE_URL=.*127\.0\.0\.1/,
  /^NEXT_PUBLIC_SUPABASE_URL=.*localhost/,
  /^SUPABASE_DB_URL=.*127\.0\.0\.1/,
  /^SUPABASE_STUDIO_URL/,
  /^SUPABASE_REST_URL/,
  /^SUPABASE_GRAPHQL_URL/,
  /^SUPABASE_STORAGE_URL/,
  /^SUPABASE_MCP_URL/,
  /^SUPABASE_MAILPIT_URL/,
  /^NODE_ENV=development/,
  /^POKEAPI_BASE_URL=.*localhost/,
  /^MINIO_ENDPOINT_INTERNAL/,
  /^MINIO_CONSOLE_INTERNAL/,
  /^SHOWDOWN_SERVER_URL/,
  /^NEXT_PUBLIC_SHOWDOWN_CLIENT_URL/,
  /^LOGINSERVER_URL/,
  /^SHOWDOWN_PASSWORD_SECRET/,
  /^SHOWDOWN_API_KEY=$/,
  /^SUPABASE_STORAGE_ACCESS_KEY=.*local/,
  /^SUPABASE_STORAGE_SECRET_KEY/,
  /^SUPABASE_STORAGE_REGION=local/,
]

// Production variables that should be added
const PRODUCTION_VARS = [
  'GOOGLE_SHEET_ID',
  'GOOGLE_SERVICE_ACCOUNT_EMAIL',
  'GOOGLE_CLIENT_ID',
  'GOOGLE_CLIENT_SECRET',
  'SUPABASE_AUTH_EXTERNAL_GOOGLE_SECRET',
  'ENCRYPTION_KEY',
  'GOOGLE_PRIVATE_KEY',
  'GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY', // Preferred over GOOGLE_PRIVATE_KEY
  'OPENAI_API_KEY',
  'MINIO_ENDPOINT_EXTERNAL',
  'MINIO_CONSOLE_EXTERNAL',
  'MINIO_ACCESS_KEY',
  'MINIO_SECRET_KEY',
  'MINIO_BUCKET_NAME',
  'MINIO_REGION',
  'SPRITES_BASE_URL',
  'NEXT_PUBLIC_SPRITES_BASE_URL',
]

function isLocalOnly(line: string): boolean {
  return LOCAL_ONLY_PATTERNS.some(pattern => pattern.test(line))
}

function parseEnvFile(filePath: string): Map<string, string> {
  const envMap = new Map<string, string>()
  
  if (!existsSync(filePath)) {
    console.error(`❌ File not found: ${filePath}`)
    return envMap
  }

  const content = readFileSync(filePath, 'utf-8')
  const lines = content.split('\n')

  for (const line of lines) {
    const trimmed = line.trim()
    
    // Skip comments and empty lines
    if (!trimmed || trimmed.startsWith('#')) {
      continue
    }

    // Skip local-only variables
    if (isLocalOnly(trimmed)) {
      continue
    }

    // Parse KEY=VALUE
    const match = trimmed.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/)
    if (match) {
      const [, key, value] = match
      // Remove quotes if present
      const cleanValue = value.replace(/^["']|["']$/g, '')
      envMap.set(key, cleanValue)
    }
  }

  return envMap
}

function getVercelEnvVars(): Set<string> {
  try {
    const output = execSync('vercel env ls', { encoding: 'utf-8' })
    const vars = new Set<string>()
    
    // Parse output to get variable names
    const lines = output.split('\n')
    for (const line of lines) {
      const match = line.match(/^\s+([A-Z_][A-Z0-9_]+)\s+/)
      if (match) {
        vars.add(match[1])
      }
    }
    
    return vars
  } catch (error) {
    console.error('❌ Failed to get Vercel environment variables:', error)
    return new Set()
  }
}

function addEnvVarToVercel(key: string, value: string, environments: string[] = ['production', 'preview', 'development']): boolean {
  try {
    // Add to each environment
    for (const env of environments) {
      console.log(`  Adding ${key} to ${env}...`)
      
      // Use stdin to pass the value
      execSync(`echo "${value.replace(/"/g, '\\"')}" | vercel env add ${key} ${env}`, {
        stdio: 'inherit',
        shell: true,
      })
    }
    
    return true
  } catch (error: any) {
    console.error(`  ❌ Failed to add ${key}:`, error.message)
    return false
  }
}

async function main() {
  console.log('🔄 Syncing Production Environment Variables to Vercel\n')
  console.log('='.repeat(60))

  // Read .env.local
  console.log('\n📖 Reading .env.local...')
  const envVars = parseEnvFile('.env.local')
  console.log(`✅ Found ${envVars.size} production-ready variables`)

  // Get existing Vercel variables
  console.log('\n📋 Checking existing Vercel variables...')
  const vercelVars = getVercelEnvVars()
  console.log(`✅ Found ${vercelVars.size} variables in Vercel`)

  // Identify variables to add
  console.log('\n🔍 Identifying variables to add/update...\n')
  const toAdd: Array<{ key: string; value: string }> = []

  for (const key of PRODUCTION_VARS) {
    const value = envVars.get(key)
    
    if (!value) {
      console.log(`⚠️  ${key}: Not found in .env.local (skipping)`)
      continue
    }

    if (vercelVars.has(key)) {
      console.log(`✅ ${key}: Already in Vercel`)
    } else {
      console.log(`➕ ${key}: Needs to be added`)
      toAdd.push({ key, value })
    }
  }

  // Also check for any other production variables not in the list
  for (const [key, value] of envVars.entries()) {
    if (!PRODUCTION_VARS.includes(key) && !vercelVars.has(key)) {
      // Check if it looks like a production variable
      if (
        key.includes('GOOGLE') ||
        key.includes('MINIO') ||
        key.includes('OPENAI') ||
        key.includes('ENCRYPTION') ||
        key.includes('SPRITES') ||
        (key.startsWith('NEXT_PUBLIC_') && !key.includes('localhost') && !key.includes('127.0.0.1'))
      ) {
        console.log(`➕ ${key}: Additional production variable found`)
        toAdd.push({ key, value })
      }
    }
  }

  if (toAdd.length === 0) {
    console.log('\n✅ All production variables are already in Vercel!')
    return
  }

  // Add variables
  console.log(`\n📤 Adding ${toAdd.length} variable(s) to Vercel...\n`)
  let successCount = 0
  let failCount = 0

  for (const { key, value } of toAdd) {
    console.log(`\nAdding: ${key}`)
    if (addEnvVarToVercel(key, value)) {
      successCount++
      console.log(`  ✅ Success`)
    } else {
      failCount++
      console.log(`  ❌ Failed`)
    }
  }

  // Summary
  console.log('\n' + '='.repeat(60))
  console.log('📊 Summary')
  console.log('='.repeat(60))
  console.log(`✅ Added: ${successCount}`)
  console.log(`❌ Failed: ${failCount}`)
  console.log(`\n✅ Sync complete!`)
}

main().catch((error) => {
  console.error('❌ Sync failed:', error)
  process.exit(1)
})
