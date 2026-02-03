/**
 * Populate Showdown Pool from Showdown Tiers
 *
 * Uses pokemon_unified view to populate showdown_pool (tier-derived reference data).
 * League draft pool (draft_pool) is Notion-only; this script populates showdown_pool
 * for Showdown features (tier lookup, point suggestions, etc.).
 *
 * Usage:
 *   pnpm tsx scripts/populate-draft-pool-from-tiers.ts [season_id]
 */

import { config } from 'dotenv'
import { resolve } from 'path'
import { createClient } from '@supabase/supabase-js'

config({ path: resolve(process.cwd(), '.env') })

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
  console.log('Populate Showdown Pool from Showdown Tiers')
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
  if ((unifiedCount ?? 0) === 0) {
    console.log('⚠️  pokemon_unified is empty; showdown_pool will get 0 rows. Populate pokemon_showdown (e.g. Showdown ingest) first.')
  }

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

  // Check current showdown pool
  console.log('📊 Step 2: Checking current showdown_pool')
  console.log('─'.repeat(70))

  const { count: currentPoolCount } = await supabase
    .from('showdown_pool')
    .select('*', { count: 'exact', head: true })
    .eq('season_id', seasonId)

  console.log(`Current showdown_pool entries for season: ${currentPoolCount || 0}`)
  console.log('')

  // Populate showdown pool
  console.log('📊 Step 3: Populating showdown_pool from Showdown tiers')
  console.log('─'.repeat(70))
  console.log('⚠️  This will insert/update showdown_pool entries')
  console.log('   Excluding: Illegal tier Pokemon')
  console.log('   Including: All other tiers mapped to point values')
  console.log('')

  // Param keys in alphabetical order to match PostgREST schema cache (p_exclude_forms, p_exclude_illegal, p_season_id)
  const { data: result, error: populateError } = await supabase.rpc(
    'populate_showdown_pool_from_tiers',
    {
      p_exclude_forms: false,
      p_exclude_illegal: true,
      p_season_id: seasonId,
    }
  )

  if (populateError) {
    console.error('❌ Error populating showdown pool:', populateError.message)
    if (populateError.message?.includes('Could not find the function')) {
      console.error('')
      console.error('Troubleshooting:')
      console.error('1. Ensure migration 20260201000000_create_showdown_pool.sql was applied to this project.')
      console.error('   - Production: applied via MCP; if using production, try Supabase Dashboard → Settings → API → Reload schema cache.')
      console.error('   - Local: run "supabase db push" or run the migration SQL in the SQL Editor.')
      console.error('2. Confirm NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env point to the intended project.')
    }
    process.exit(1)
  }

  console.log('✅ Showdown pool populated successfully!')
  console.log('')
  console.log('📊 Results:')
  console.log(`   Inserted: ${result.inserted}`)
  console.log(`   Updated: ${result.updated}`)
  console.log(`   Skipped: ${result.skipped}`)
  console.log(`   Total processed: ${result.total_processed}`)
  console.log('')

  // Verify results
  console.log('📊 Step 4: Verifying showdown_pool population')
  console.log('─'.repeat(70))

  const { count: newPoolCount } = await supabase
    .from('showdown_pool')
    .select('*', { count: 'exact', head: true })
    .eq('season_id', seasonId)

  console.log(`Total showdown_pool entries: ${newPoolCount || 0}`)

  // Check point value distribution
  const { data: pointDistribution } = await supabase
    .from('showdown_pool')
    .select('point_value')
    .eq('season_id', seasonId)

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
    .from('showdown_pool')
    .select('pokemon_name, point_value, pokemon_id, generation')
    .eq('season_id', seasonId)
    .order('point_value', { ascending: false })
    .limit(10)

  console.log('Sample entries (highest point values):')
  sampleEntries?.forEach(p => {
    console.log(
      `  ${p.pokemon_name} (ID: ${p.pokemon_id ?? 'N/A'}) - ${p.point_value} points (Gen ${p.generation ?? 'N/A'})`
    )
  })
  console.log('')

  console.log('='.repeat(70))
  console.log('✅ Showdown Pool Population Complete!')
  console.log('='.repeat(70))
  console.log('')
  console.log('Next steps:')
  console.log('1. Review showdown_pool entries in Supabase dashboard')
  console.log('2. Adjust tier-to-point mappings in map_tier_to_point_value if needed')
  console.log('3. draft_pool is Notion-only; use n8n sync for league draft pool')
  console.log('')
}

main().catch(console.error)
