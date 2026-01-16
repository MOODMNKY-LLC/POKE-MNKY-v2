/**
 * Analyze Production Environment Variables
 * Compare server .env with Vercel to identify missing/updated variables
 */

interface EnvVar {
  key: string
  value: string
  category: string
  needsUpdate: boolean
  reason: string
}

// Production variables from server
const productionVars: Array<{ key: string; value: string; category: string }> = [
  // Application URLs
  { key: 'APP_URL', value: 'https://poke-mnky.moodmnky.com', category: 'Application' },
  { key: 'NEXT_PUBLIC_APP_URL', value: 'https://poke-mnky.moodmnky.com', category: 'Application' },
  
  // Supabase Production
  { key: 'NEXT_PUBLIC_SUPABASE_URL', value: 'https://chmrszrwlfeqovwxyrmt.supabase.co', category: 'Supabase' },
  { key: 'NEXT_PUBLIC_SUPABASE_ANON_KEY', value: '***REMOVED***', category: 'Supabase' },
  { key: 'SUPABASE_SERVICE_ROLE_KEY', value: '***REMOVED***', category: 'Supabase' },
  
  // Discord Production
  { key: 'DISCORD_BOT_TOKEN', value: 'your-discord-bot-token-here', category: 'Discord' },
  { key: 'DISCORD_GUILD_ID', value: '1069695816001933332', category: 'Discord' },
  { key: 'DISCORD_RESULTS_CHANNEL_ID', value: 'your-results-channel-id-here', category: 'Discord' },
  { key: 'DISCORD_GUILD_IDS', value: '1069695816001933332,1190512330556063764', category: 'Discord' },
  
  // Showdown Production
  { key: 'SHOWDOWN_SERVER_URL', value: 'https://aab-showdown.moodmnky.com', category: 'Showdown' },
  { key: 'NEXT_PUBLIC_SHOWDOWN_CLIENT_URL', value: 'https://aab-play.moodmnky.com', category: 'Showdown' },
  { key: 'SHOWDOWN_API_KEY', value: '***REMOVED***', category: 'Showdown' },
  { key: 'SHOWDOWN_PUBLIC_URL', value: 'https://aab-play.moodmnky.com', category: 'Showdown' },
  { key: 'SHOWDOWN_PASSWORD_SECRET', value: 'change-me-in-production-generate-secure-random-string', category: 'Showdown' },
  { key: 'SHOWDOWN_COOKIE_DOMAIN', value: 'moodmnky.com', category: 'Showdown' },
  
  // Loginserver
  { key: 'LOGINSERVER_PRIVATE_KEY', value: '***REMOVED***', category: 'Loginserver' },
  
  // MinIO Production URLs
  { key: 'MINIO_ENDPOINT_EXTERNAL', value: 'https://s3-api-data.moodmnky.com', category: 'MinIO' },
  { key: 'MINIO_CONSOLE_EXTERNAL', value: 'https://s3-console-data.moodmnky.com', category: 'MinIO' },
  { key: 'SPRITES_BASE_URL', value: 'https://s3-api-data.moodmnky.com/pokedex-sprites', category: 'MinIO' },
  { key: 'NEXT_PUBLIC_SPRITES_BASE_URL', value: 'https://s3-api-data.moodmnky.com/pokedex-sprites', category: 'MinIO' },
  
  // PokéAPI Production
  { key: 'POKEAPI_BASE_URL', value: 'https://pokeapi.co/api/v2', category: 'PokéAPI' },
  { key: 'NEXT_PUBLIC_POKEAPI_BASE_URL', value: 'https://pokeapi.co/api/v2', category: 'PokéAPI' },
]

// Variables to exclude (server-specific, Docker internal, placeholders)
const excludePatterns = [
  /^PS_PORT=/,
  /^LOGINSERVER_PORT=/,
  /^LOGINSERVER_DATABASE_URL=$/,
  /^S3_ENDPOINT=/,
  /^S3_ACCESS_KEY=/,
  /^S3_SECRET_KEY=/,
  /^S3_BUCKET_SPRITES=/,
  /^POKEAPI_PUBLIC_HOSTNAME=/,
  /^POKEAPI_DB_PASSWORD=/,
  /^DITTO_SOURCE_URL=/,
  /^DITTO_TARGET_URL=/,
  /^TUNNEL_ID=/,
  /^TUNNEL_CREDENTIALS_FILE=/,
  /^NOTION_API_KEY=/,
  /^NOTION_RULES_DATABASE_ID=/,
  /^NOTION_ANNOUNCEMENTS_DATABASE_ID=/,
  /^SUPABASE_DB_PASSWORD=/,
  /^SUPABASE_DB_URL=/,
  /^DISCORD_RESULTS_CHANNEL_ID=your-results-channel-id-here/,
  /^SHOWDOWN_PASSWORD_SECRET=change-me-in-production/,
]

function shouldExclude(key: string, value: string): boolean {
  return excludePatterns.some(pattern => pattern.test(`${key}=${value}`))
}

function analyzeVariables(): void {
  console.log('🔍 Analyzing Production Environment Variables\n')
  console.log('='.repeat(60))
  
  const toAdd: EnvVar[] = []
  const toUpdate: EnvVar[] = []
  const toReview: EnvVar[] = []
  
  for (const { key, value, category } of productionVars) {
    if (shouldExclude(key, value)) {
      continue
    }
    
    // Check if it's a placeholder or needs review
    if (value.includes('your-') || value.includes('change-me') || value.includes('generate-')) {
      toReview.push({ key, value, category, needsUpdate: false, reason: 'Contains placeholder value' })
      continue
    }
    
    // These should be added/updated
    toAdd.push({ key, value, category, needsUpdate: false, reason: 'Production value from server' })
  }
  
  console.log('\n📋 Variables to Add/Update:\n')
  
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
      const displayValue = var_.value.length > 50 
        ? `${var_.value.substring(0, 47)}...` 
        : var_.value
      console.log(`  ✅ ${var_.key} = ${displayValue}`)
    }
  }
  
  if (toReview.length > 0) {
    console.log('\n⚠️  Variables Needing Review (placeholders):')
    for (const var_ of toReview) {
      console.log(`  ⚠️  ${var_.key} = ${var_.value.substring(0, 50)}...`)
    }
  }
  
  console.log('\n' + '='.repeat(60))
  console.log(`\n📊 Summary:`)
  console.log(`  Total variables to add: ${toAdd.length}`)
  console.log(`  Variables needing review: ${toReview.length}`)
  console.log(`\n✅ Ready to proceed with adding ${toAdd.length} variables`)
}

analyzeVariables()
