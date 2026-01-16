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
  { key: 'NEXT_PUBLIC_SUPABASE_ANON_KEY', value: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNobXJzenJ3bGZlcW92d3h5cm10Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjgxOTk0MTMsImV4cCI6MjA4Mzc3NTQxM30.z2LyP9rcQF0avvryv-5P3QzIYKCrVIWTnui7zS7Tpy0', category: 'Supabase' },
  { key: 'SUPABASE_SERVICE_ROLE_KEY', value: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNobXJzenJ3bGZlcW92d3h5cm10Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2ODE5OTQxMywiZXhwIjoyMDgzNzc1NDEzfQ.uTi9Re3MetIiwgtaS51JIbI1Oay1UCKy5aHmYz1QDHY', category: 'Supabase' },
  
  // Discord Production
  { key: 'DISCORD_BOT_TOKEN', value: 'your-discord-bot-token-here', category: 'Discord' },
  { key: 'DISCORD_GUILD_ID', value: '1069695816001933332', category: 'Discord' },
  { key: 'DISCORD_RESULTS_CHANNEL_ID', value: 'your-results-channel-id-here', category: 'Discord' },
  { key: 'DISCORD_GUILD_IDS', value: '1069695816001933332,1190512330556063764', category: 'Discord' },
  
  // Showdown Production
  { key: 'SHOWDOWN_SERVER_URL', value: 'https://aab-showdown.moodmnky.com', category: 'Showdown' },
  { key: 'NEXT_PUBLIC_SHOWDOWN_CLIENT_URL', value: 'https://aab-play.moodmnky.com', category: 'Showdown' },
  { key: 'SHOWDOWN_API_KEY', value: '5828714b68d1b1251425aba63d28edb164fa3f42e9523fbff8c5979107317750', category: 'Showdown' },
  { key: 'SHOWDOWN_PUBLIC_URL', value: 'https://aab-play.moodmnky.com', category: 'Showdown' },
  { key: 'SHOWDOWN_PASSWORD_SECRET', value: 'change-me-in-production-generate-secure-random-string', category: 'Showdown' },
  { key: 'SHOWDOWN_COOKIE_DOMAIN', value: 'moodmnky.com', category: 'Showdown' },
  
  // Loginserver
  { key: 'LOGINSERVER_PRIVATE_KEY', value: '-----BEGIN PRIVATE KEY-----\nMIIEuwIBADANBgkqhkiG9w0BAQEFAASCBKUwggShAgEAAoIBAQCgEfZclWrlOPak\nmfDtNeucbiLruc6nw7O4x73pc6ThektlGdk58LYg3MucwaDnTDvH2YfTocQoQnvY\ne4nz0jKoSrhhZpUoJvG9TRv/z6wBajI0hFI2bXUkRdLKrLJmo7hV2dCsXjMXaP6b\naXs9LvpCs238R1/zjha4rrh9M0ayeVv1Od4D/nJfk8em+037pU+Uq/43mpSt+e4g\n3Mva+bivLT6w5n7fMDpafYnhkzjqTWBpTSECGdERmBFzspqcSHUfiAks4OiT/cRy\nD7K4HcCKyzgsxyYu6pu1+nXA5xIsGH4gbMs9hP7xjco7TEqWKrRvDeG3aGiQrPkY\n2xdja8rfAgMBAAECgf85p+eaupt0XgAF85w7m4DS4UGZuHiF3X4p+OIejRU0VFjc\ns0OWUs7UOlZwMpF/RNRQ2PaL65R0l82T6TnbVpRDTSElhBJHcXFsUyNdnL+RfYt7\nHjKw0xHhMQLaawjff2sUsTYSFeZr0gLokSVny0PXgn0JmzsD+cCVTkgLs/LDD71K\nzbHP4BxE9gFq0i62aUF+OmqxI+xC8gzddXdyCi2BCuxCiVKY1w+ZdEKO6rYpPJTR\nsTjaolrQXO82XwcfcRuIm7zMCOpDfEoNRu0ZmGJA2iBLX0bKYO32o3i2nb1qWZXP\nYoF++5als6EXb3KYsZBV7R7QIVDRLB/69Dhh42kCgYEA3eHL2W2PRQ8iRxObKpGK\niIIyG4UXzf/AKoW2HeeKKi7Y5zmDKqDq3uqDoEDzuwQftiY0oVRwv4MC1gmjIw37\nFPn6nAwwwQ8cB+7wqvX2vfnh5y3e5VpwfNkzjwcISalI8CN0PJltq41bwqnE48b0\nMOphbOJlSeBcDWyxm3vd+T0CgYEAuK7+QpjHuHovY44UnEGxYi8/RjlszZ8qYJAG\nVvv/vHGk6nz6PPFO1/LxUWsw7KMftPTRHRrD/trxCxWcsYSU4wLXgzp9lr2z+zXY\niml4/JoS0aALAe6xWcxh4mOFzf/w6oErr1fImIdkrsIXEf5B2pjiFWECid6KpaJZ\nnq2TPksCgYEAlIhzTjppjnFzIOGfHgAQHRILOSD/rodmvRCFub8mXta9nQyDIiZX\nFKMpOj5A6xD3qZgp41YDpDCv1VjePLk/O+ucOJpwiMz0ltr9gXTmmIaPE5NBg4fn\nhaxhN34drjIFAby6M1cCc7VNmCLOCy1Eivpb/egQpkPrW5FH1C43ioECgYAZFUNZ\nPjDaAFZRWim4cz+pSyt32TLK1pRF2ynRRJaePH0ej+zYvBluQQO/gCR770fOJvYD\n0u/NvGTCkaPfhFdIYcltfFM0Vv2L3+tSGTMic7acm/UCxS13OcgNnGC+8sUAxJxv\nSyfmd3UYOyow+mxtSRhjuPJEUWJZTqyHXaHC8wKBgExYfgJ8MsqEupM3No/g2X1h\naVGD/SLnX94Z35KE6lZewzNXiNrma0po1yLDC5eviIObNllpGmRqQfDl4st+wJ5t\nxjtlyeOBeivPB9fSRnIZsdioH4rXwOBSLmdqBE0FB/m7WB3goRVP9d/PGCslXOtr\ntsRF22bUU4niJBJFfpAO\n-----END PRIVATE KEY-----', category: 'Loginserver' },
  
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
