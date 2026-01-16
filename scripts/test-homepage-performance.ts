/**
 * Homepage Performance Testing Script
 * 
 * Tests homepage performance with and without caching
 * Measures query times, cache hit rates, and overall page load performance
 */

import { createClient } from '@supabase/supabase-js'
import { redisCache, CacheKeys, CacheTTL } from '../lib/cache/redis'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase environment variables')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

interface PerformanceTest {
  name: string
  withCache: boolean
  duration: number
  cacheHit: boolean
  error?: string
}

const tests: PerformanceTest[] = []

async function testHomepageQueries(useCache: boolean = false) {
  const testName = useCache ? 'With Cache' : 'Without Cache'
  console.log(`\n🧪 Testing Homepage Queries (${testName})...\n`)

  const startTime = Date.now()

  // Try cache first if enabled
  if (useCache && redisCache.isEnabled()) {
    const [cachedTeams, cachedMatchCount, cachedRecentMatches, cachedTopPokemon] = await Promise.all([
      redisCache.get(CacheKeys.homepageTeams),
      redisCache.get(CacheKeys.homepageMatchCount),
      redisCache.get(CacheKeys.homepageRecentMatches),
      redisCache.get(CacheKeys.homepageTopPokemon),
    ])

    if (cachedTeams && cachedMatchCount !== null && cachedRecentMatches && cachedTopPokemon !== null) {
      const duration = Date.now() - startTime
      tests.push({
        name: testName,
        withCache: true,
        duration,
        cacheHit: true,
      })
      console.log(`✅ Cache Hit: ${duration}ms`)
      return
    }
  }

  // Query database
  const queryTimeout = 10000
  const queryStart = Date.now()

  const [teamsResult, matchesCountResult, recentMatchesResult, pokemonStatsResult] = await Promise.all([
    supabase
      .from('teams')
      .select('id, name, wins, losses, division, conference, coach_name, avatar_url', { count: 'exact' })
      .order('wins', { ascending: false })
      .limit(5),
    supabase
      .from('matches')
      .select('*', { count: 'exact', head: true })
      .eq('is_playoff', false),
    supabase
      .from('matches')
      .select(
        `
        id, week, team1_id, team2_id, winner_id,
        team1_score, team2_score, created_at,
        team1:team1_id(name, coach_name),
        team2:team2_id(name, coach_name),
        winner:winner_id(name)
      `,
      )
      .eq('is_playoff', false)
      .order('created_at', { ascending: false })
      .limit(3),
    supabase
      .from('pokemon_stats')
      .select('pokemon_id, kills')
      .order('kills', { ascending: false })
      .limit(3),
  ])

  const queryDuration = Date.now() - queryStart
  const totalDuration = Date.now() - startTime

  // Cache results if enabled
  if (useCache && redisCache.isEnabled()) {
    await Promise.all([
      teamsResult.data
        ? redisCache.set(CacheKeys.homepageTeams, { data: teamsResult.data, count: teamsResult.count || 0 }, { ttl: CacheTTL.homepage })
        : Promise.resolve(false),
      matchesCountResult.count !== null
        ? redisCache.set(CacheKeys.homepageMatchCount, matchesCountResult.count, { ttl: CacheTTL.homepage })
        : Promise.resolve(false),
      recentMatchesResult.data
        ? redisCache.set(CacheKeys.homepageRecentMatches, recentMatchesResult.data, { ttl: CacheTTL.homepage })
        : Promise.resolve(false),
      pokemonStatsResult.data
        ? redisCache.set(CacheKeys.homepageTopPokemon, pokemonStatsResult.data, { ttl: CacheTTL.homepage })
        : Promise.resolve(false),
    ])
  }

  tests.push({
    name: testName,
    withCache: useCache,
    duration: totalDuration,
    cacheHit: false,
  })

  console.log(`📊 Query Time: ${queryDuration}ms`)
  console.log(`⏱️  Total Time: ${totalDuration}ms`)
  console.log(`📈 Teams: ${teamsResult.data?.length || 0}`)
  console.log(`📈 Matches: ${matchesCountResult.count || 0}`)
  console.log(`📈 Recent Matches: ${recentMatchesResult.data?.length || 0}`)
  console.log(`📈 Top Pokemon: ${pokemonStatsResult.data?.length || 0}`)
}

async function runPerformanceTests() {
  console.log('🚀 Homepage Performance Testing\n')
  console.log('='.repeat(60))

  // Test 1: Without cache (baseline)
  await testHomepageQueries(false)

  // Wait a bit
  await new Promise(resolve => setTimeout(resolve, 1000))

  // Test 2: With cache (first run - cache miss)
  await testHomepageQueries(true)

  // Wait a bit
  await new Promise(resolve => setTimeout(resolve, 500))

  // Test 3: With cache (second run - cache hit)
  await testHomepageQueries(true)

  // Generate report
  console.log('\n' + '='.repeat(60))
  console.log('📊 PERFORMANCE REPORT')
  console.log('='.repeat(60) + '\n')

  const withoutCache = tests.find(t => !t.withCache)
  const withCacheMiss = tests.find(t => t.withCache && !t.cacheHit)
  const withCacheHit = tests.find(t => t.withCache && t.cacheHit)

  if (withoutCache) {
    console.log(`📉 Without Cache: ${withoutCache.duration}ms`)
  }

  if (withCacheMiss) {
    console.log(`📊 With Cache (Miss): ${withCacheMiss.duration}ms`)
  }

  if (withCacheHit) {
    console.log(`✅ With Cache (Hit): ${withCacheHit.duration}ms`)
    
    if (withoutCache && withCacheHit) {
      const improvement = ((withoutCache.duration - withCacheHit.duration) / withoutCache.duration * 100).toFixed(1)
      console.log(`\n🚀 Performance Improvement: ${improvement}% faster with cache`)
    }
  }

  console.log('')
}

runPerformanceTests().catch((error) => {
  console.error('❌ Performance test failed:', error)
  process.exit(1)
})
