/**
 * Analyze Local Development Environment Variables
 * Identify which should be added to Vercel Development/Preview environments
 */

interface EnvVar {
  key: string
  value: string
  category: string
  environments: ('Production' | 'Preview' | 'Development')[]
  note: string
}

// Local development variables (from .env.local)
const localDevVars: Array<{ key: string; value: string; category: string }> = [
  // Application URLs (Local)
  { key: 'APP_URL', value: 'http://localhost:3000', category: 'Application' },
  { key: 'NEXT_PUBLIC_APP_URL', value: 'http://localhost:3000', category: 'Application' },
  
  // Supabase Local URLs (should NOT go to Vercel - localhost only)
  // These are excluded: SUPABASE_API_URL, SUPABASE_STUDIO_URL, etc.
  
  // Supabase Local Keys (should go to Development/Preview)
  { key: 'SUPABASE_ANON_KEY', value: 'eyJhbGciOiJFUzI1NiIsImtpZCI6ImI4MTI2OWYxLTIxZDgtNGYyZS1iNzE5LWMyMjQwYTg0MGQ5MCIsInR5cCI6IkpXVCJ9...', category: 'Supabase' },
  { key: 'SUPABASE_SERVICE_ROLE_KEY', value: 'eyJhbGciOiJFUzI1NiIsImtpZCI6ImI4MTI2OWYxLTIxZDgtNGYyZS1iNzE5LWMyMjQwYTg0MGQ5MCIsInR5cCI6IkpXVCJ9...', category: 'Supabase' },
  { key: 'SUPABASE_PUBLISHABLE_KEY', value: 'sb_publishable_ACJWlzQHlZjBrEguHvfOxg_3BJgxAaH', category: 'Supabase' },
  { key: 'SUPABASE_SECRET_KEY', value: 'sb_secret_N7UND0UgjKTVK-Uodkm0Hg_xSvEMPvz', category: 'Supabase' },
  { key: 'SUPABASE_JWT_SECRET', value: 'super-secret-jwt-token-with-at-least-32-characters-long', category: 'Supabase' },
  { key: 'JWT_SECRET', value: 'super-secret-jwt-token-with-at-least-32-characters-long', category: 'Supabase' },
  { key: 'SUPABASE_STORAGE_ACCESS_KEY', value: '625729a08b95bf1b7ff351a663f3a23c', category: 'Supabase' },
  { key: 'SUPABASE_STORAGE_SECRET_KEY', value: '850181e4652dd023b7a98c58ae0d2d34bd487ee0cc3254aed6eda37307425907', category: 'Supabase' },
  { key: 'SUPABASE_STORAGE_REGION', value: 'local', category: 'Supabase' },
  { key: 'SUPABASE_MANAGEMENT_API_TOKEN', value: 'sbp_810ec88f472beddfca3037ab970f716e93d31bf3', category: 'Supabase' },
  
  // MinIO Local (should NOT go to Vercel - internal IPs)
  // These are excluded: MINIO_ENDPOINT_INTERNAL, MINIO_CONSOLE_INTERNAL
  
  // PokéAPI Local (should NOT go to Vercel - localhost)
  // These are excluded: POKEAPI_BASE_URL=http://localhost, NEXT_PUBLIC_POKEAPI_BASE_URL=http://localhost
  
  // Showdown (already pointing to production, so these are fine)
  { key: 'SHOWDOWN_SERVER_URL', value: 'https://aab-showdown.moodmnky.com', category: 'Showdown' },
  { key: 'NEXT_PUBLIC_SHOWDOWN_CLIENT_URL', value: 'https://aab-play.moodmnky.com', category: 'Showdown' },
  
  // Discord (shared, but DISCORD_GUILD_ID is different - local has old dev ID)
  { key: 'DISCORD_GUILD_ID', value: '1069695816001933332', category: 'Discord' }, // OLD DEV - should NOT update
  { key: 'DISCORD_GUILD_IDS', value: '1069695816001933332,1190512330556063764', category: 'Discord' },
  { key: 'DISCORD_RESULTS_CHANNEL_ID', value: 'your-results-channel-id-here', category: 'Discord' }, // Placeholder
  
  // Loginserver Local (should NOT go to Vercel - localhost)
  // These are excluded: LOGINSERVER_URL=http://localhost, SHOWDOWN_PASSWORD_SECRET=local-dev-secret
]

// Variables to exclude (localhost, internal IPs, placeholders)
const excludePatterns = [
  /^.*URL=.*localhost/i,
  /^.*URL=.*127\.0\.0\.1/i,
  /^.*URL=.*10\.0\.0\./i, // Internal IPs
  /^SUPABASE_API_URL=/i,
  /^SUPABASE_STUDIO_URL=/i,
  /^SUPABASE_MAILPIT_URL=/i,
  /^SUPABASE_INBUCKET_URL=/i,
  /^SUPABASE_REST_URL=/i,
  /^SUPABASE_GRAPHQL_URL=/i,
  /^SUPABASE_FUNCTIONS_URL=/i,
  /^SUPABASE_STORAGE_URL=/i,
  /^SUPABASE_MCP_URL=/i,
  /^SUPABASE_DB_URL=/i,
  /^DB_URL=/i,
  /^MINIO_ENDPOINT_INTERNAL=/i,
  /^MINIO_CONSOLE_INTERNAL=/i,
  /^SPRITES_BASE_URL=.*10\.0\.0\./i,
  /^NEXT_PUBLIC_SPRITES_BASE_URL=.*10\.0\.0\./i,
  /^POKEAPI_BASE_URL=.*localhost/i,
  /^NEXT_PUBLIC_POKEAPI_BASE_URL=.*localhost/i,
  /^LOGINSERVER_URL=.*localhost/i,
  /^SHOWDOWN_PASSWORD_SECRET=local-dev-secret/i,
  /^DISCORD_RESULTS_CHANNEL_ID=your-results-channel-id-here/i,
  /^DISCORD_GUILD_ID=1069695816001933332/i, // OLD DEV ID - don't update
]

function shouldExclude(key: string, value: string): boolean {
  return excludePatterns.some(pattern => pattern.test(`${key}=${value}`))
}

function analyzeVariables(): void {
  console.log('🔍 Analyzing Local Development Environment Variables\n')
  console.log('='.repeat(60))
  
  const toAdd: EnvVar[] = []
  const excluded: Array<{ key: string; reason: string }> = []
  
  // Variables that should be added to Development/Preview (NOT Production)
  const devOnlyVars = [
    { key: 'SUPABASE_ANON_KEY', value: 'eyJhbGciOiJFUzI1NiIsImtpZCI6ImI4MTI2OWYxLTIxZDgtNGYyZS1iNzE5LWMyMjQwYTg0MGQ5MCIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjIwODM3NzIyMjR9.xzrMwjtbusHRe8VFyjrJ64HQdADSOMyFthe79W-BIrR5VE9MyW0D9l5HdH2FVV5XlfiQYnn_3fWDgjbPHakC2A', category: 'Supabase' },
    { key: 'SUPABASE_SERVICE_ROLE_KEY', value: 'eyJhbGciOiJFUzI1NiIsImtpZCI6ImI4MTI2OWYxLTIxZDgtNGYyZS1iNzE5LWMyMjQwYTg0MGQ5MCIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MjA4Mzc3MjIyNH0.wKntB-qJcY3dQnnyGgh3biGiwUIxY4BrMijXdMt5xn5AcFNWK7Bl18rBOmXTlxssNZw8iIZi8xBXExHrZkGcVQ', category: 'Supabase' },
    { key: 'SUPABASE_PUBLISHABLE_KEY', value: 'sb_publishable_ACJWlzQHlZjBrEguHvfOxg_3BJgxAaH', category: 'Supabase' },
    { key: 'SUPABASE_SECRET_KEY', value: 'sb_secret_N7UND0UgjKTVK-Uodkm0Hg_xSvEMPvz', category: 'Supabase' },
    { key: 'SUPABASE_JWT_SECRET', value: 'super-secret-jwt-token-with-at-least-32-characters-long', category: 'Supabase' },
    { key: 'JWT_SECRET', value: 'super-secret-jwt-token-with-at-least-32-characters-long', category: 'Supabase' },
    { key: 'SUPABASE_STORAGE_ACCESS_KEY', value: '625729a08b95bf1b7ff351a663f3a23c', category: 'Supabase' },
    { key: 'SUPABASE_STORAGE_SECRET_KEY', value: '850181e4652dd023b7a98c58ae0d2d34bd487ee0cc3254aed6eda37307425907', category: 'Supabase' },
    { key: 'SUPABASE_STORAGE_REGION', value: 'local', category: 'Supabase' },
    { key: 'SUPABASE_MANAGEMENT_API_TOKEN', value: 'sbp_810ec88f472beddfca3037ab970f716e93d31bf3', category: 'Supabase' },
  ]
  
  for (const { key, value, category } of devOnlyVars) {
    if (shouldExclude(key, value)) {
      excluded.push({ key, reason: 'Matches exclusion pattern' })
      continue
    }
    
    toAdd.push({
      key,
      value,
      category,
      environments: ['Development', 'Preview'], // NOT Production
      note: 'Local Supabase development keys'
    })
  }
  
  // DISCORD_GUILD_IDS - add to all environments (includes both IDs)
  toAdd.push({
    key: 'DISCORD_GUILD_IDS',
    value: '1069695816001933332,1190512330556063764',
    category: 'Discord',
    environments: ['Production', 'Preview', 'Development'],
    note: 'Comma-separated list of Discord guild IDs (both dev and prod)'
  })
  
  console.log('\n📋 Variables to Add:\n')
  
  const byCategory = new Map<string, EnvVar[]>()
  for (const var_ of toAdd) {
    if (!byCategory.has(var_.category)) {
      byCategory.set(var_.category, [])
    }
    byCategory.get(var_.category)!.push(var_)
  }
  
  for (const [category, vars] of byCategory.entries()) {
    console.log(`\n${category}:`)
    for (const var_ of vars) {
      const envs = var_.environments.join(', ')
      const displayValue = var_.value.length > 50 
        ? `${var_.value.substring(0, 47)}...` 
        : var_.value
      console.log(`  ✅ ${var_.key}`)
      console.log(`     Value: ${displayValue}`)
      console.log(`     Environments: ${envs}`)
      if (var_.note) {
        console.log(`     Note: ${var_.note}`)
      }
    }
  }
  
  if (excluded.length > 0) {
    console.log('\n⚠️  Excluded Variables (localhost/internal IPs):')
    for (const { key, reason } of excluded) {
      console.log(`  ⚠️  ${key} - ${reason}`)
    }
  }
  
  console.log('\n' + '='.repeat(60))
  console.log(`\n📊 Summary:`)
  console.log(`  Variables to add: ${toAdd.length}`)
  console.log(`  Variables excluded: ${excluded.length}`)
  console.log(`\n✅ Ready to proceed`)
}

analyzeVariables()
