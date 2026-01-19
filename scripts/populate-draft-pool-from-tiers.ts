/**
 * Populate Draft Pool from Showdown Tiers
 * 
 * Uses pokemon_unified view to intelligently populate draft_pool
 * based on Showdown competitive tiers
 * 
 * Usage:
 *   pnpm tsx scripts/populate-draft-pool-from-tiers.ts [season_id]
 */

import { config } from 'dotenv'
import { resolve } from 'path'
import { createClient } from '@supabase/supabase-js'

config({ path: resolve(process.cwd(), '.env.local') })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing environment variables')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
})

async function main() {
  console.log('='.repeat(70))
  console.log('Populate Draft Pool from Showdown Tiers')
  console.log('='.repeat(70))
  console.log('')

  // Get season_id from args or find current season
  const seasonIdArg = process.argv[2]
  let seasonId: string

  if (seasonIdArg) {
    seasonId = seasonIdArg
    console.log(`📋 Using provided season_id: ${seasonId}`)
  } else {
    // Find current season
    const { data: season, error: seasonError } = await supabase
      .from('seasons')
      .select('id, name, is_current')
      .eq('is_current', true)
      .single()

    if (seasonError || !season) {
      console.error('❌ No current season found. Please provide season_id as argument.')
      console.error('   Usage: pnpm tsx scripts/populate-draft-pool-from-tiers.ts <season_id>')
      process.exit(1)
    }

    seasonId = season.id
    console.log(`📋 Using current season: ${season.name} (${seasonId})`)
  }
  console.log('')

  // Verify pokemon_unified has data
  console.log('📊 Step 1: Verifying pokemon_unified view')
  console.log('─'.repeat(70))
  
  const { count: unifiedCount, error: unifiedError } = await supabase
    .from('pokemon_unified')
    .select('*', { count: 'exact', head: true })

  if (unifiedError) {
    console.error('❌ Error querying pokemon_unified:', unifiedError.message)
    process.exit(1)
  }

  console.log(`✅ pokemon_unified: ${unifiedCount || 0} records`)

  // Check tier distribution
  const { data: tierSample } = await supabase
    .from('pokemon_unified')
    .select('showdown_tier')
    .not('showdown_tier', 'is', null)
    .limit(100)

  const tierCounts: Record<string, number> = {}
  tierSample?.forEach(p => {
    const tier = p.showdown_tier || 'Unknown'
    tierCounts[tier] = (tierCounts[tier] || 0) + 1
  })

  console.log('\nSample tier distribution:')
  Object.entries(tierCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .forEach(([tier, count]) => {
      console.log(`  ${tier}: ${count}`)
    })
  console.log('')

  // Check current draft pool
  console.log('📊 Step 2: Checking current draft pool')
  console.log('─'.repeat(70))
  
  const { count: currentPoolCount } = await supabase
    .from('draft_pool')
    .select('*', { count: 'exact', head: true })
    .eq('season_id', seasonId)

  console.log(`Current draft_pool entries for season: ${currentPoolCount || 0}`)
  console.log('')

  // Populate draft pool
  console.log('📊 Step 3: Populating draft pool from Showdown tiers')
  console.log('─'.repeat(70))
  console.log('⚠️  This will insert/update draft_pool entries')
  console.log('   Excluding: Illegal tier Pokemon')
  console.log('   Including: All other tiers mapped to point values')
  console.log('')

  const { data: result, error: populateError } = await supabase
    .rpc('populate_draft_pool_from_showdown_tiers', {
      p_season_id: seasonId,
      p_exclude_illegal: true,
      p_exclude_forms: false
    })

  if (populateError) {
    console.error('❌ Error populating draft pool:', populateError.message)
    process.exit(1)
  }

  console.log('✅ Draft pool populated successfully!')
  console.log('')
  console.log('📊 Results:')
  console.log(`   Inserted: ${result.inserted}`)
  console.log(`   Updated: ${result.updated}`)
  console.log(`   Skipped: ${result.skipped}`)
  console.log(`   Total processed: ${result.total_processed}`)
  console.log('')

  // Verify results
  console.log('📊 Step 4: Verifying draft pool population')
  console.log('─'.repeat(70))
  
  const { count: newPoolCount } = await supabase
    .from('draft_pool')
    .select('*', { count: 'exact', head: true })
    .eq('season_id', seasonId)

  console.log(`Total draft_pool entries: ${newPoolCount || 0}`)

  // Check point value distribution
  const { data: pointDistribution } = await supabase
    .from('draft_pool')
    .select('point_value')
    .eq('season_id', seasonId)
    .eq('status', 'available')

  const pointCounts: Record<number, number> = {}
  pointDistribution?.forEach(p => {
    const points = p.point_value
    pointCounts[points] = (pointCounts[points] || 0) + 1
  })

  console.log('\nPoint value distribution:')
  Object.entries(pointCounts)
    .sort((a, b) => parseInt(b[0]) - parseInt(a[0]))
    .forEach(([points, count]) => {
      console.log(`  ${points} points: ${count} Pokemon`)
    })
  console.log('')

  // Sample entries
  const { data: sampleEntries } = await supabase
    .from('draft_pool')
    .select('pokemon_name, point_value, pokemon_id, generation')
    .eq('season_id', seasonId)
    .eq('status', 'available')
    .order('point_value', { ascending: false })
    .limit(10)

  console.log('Sample entries (highest point values):')
  sampleEntries?.forEach(p => {
    console.log(`  ${p.pokemon_name} (ID: ${p.pokemon_id || 'N/A'}) - ${p.point_value} points (Gen ${p.generation || 'N/A'})`)
  })
  console.log('')

  console.log('='.repeat(70))
  console.log('✅ Draft Pool Population Complete!')
  console.log('='.repeat(70))
  console.log('')
  console.log('Next steps:')
  console.log('1. Review draft_pool entries in Supabase dashboard')
  console.log('2. Adjust tier-to-point mappings if needed')
  console.log('3. Use draft_pool_comprehensive view for enhanced queries')
  console.log('')
}

main().catch(console.error)
