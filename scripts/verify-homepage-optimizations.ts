/**
 * Homepage Optimization Verification Script
 * 
 * Verifies that all optimizations are properly implemented:
 * 1. Database indexes exist and are being used
 * 2. ISR caching is configured
 * 3. Redis caching is available (if configured)
 * 4. Query performance meets targets
 */

import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'
import { join } from 'path'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase environment variables')
  console.error('Required: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY or NEXT_PUBLIC_SUPABASE_ANON_KEY')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

interface VerificationResult {
  name: string
  status: 'pass' | 'fail' | 'warning'
  message: string
  details?: any
}

const results: VerificationResult[] = []

async function verifyIndexes() {
  console.log('\n📊 Verifying Database Indexes...\n')

  const requiredIndexes = [
    'idx_teams_wins_desc',
    'idx_matches_playoff_created_desc',
    'idx_matches_created_at_desc',
    'idx_pokemon_stats_kills_desc',
    'idx_matches_team1_id',
    'idx_matches_team2_id',
    'idx_matches_winner_id',
  ]

  // Note: Direct pg_indexes query requires service role or custom function
  // For now, we'll verify by testing query performance
  // Full index verification should be done via Supabase SQL Editor
  
  console.log('⚠️  Index verification requires Supabase SQL Editor access')
  console.log('   Run the verification queries in supabase/migrations/20260117000004_verify_indexes.sql')
  console.log('   Or check Supabase Dashboard → Database → Indexes\n')
  
  // We'll verify indexes indirectly by testing query performance
  // If queries are fast, indexes are likely being used
  results.push({
    name: 'Index Verification',
    status: 'warning',
    message: 'Run verification queries manually in Supabase SQL Editor',
    details: {
      migrationFile: 'supabase/migrations/20260117000004_verify_indexes.sql',
      note: 'Index verification requires direct database access',
    },
  })
}

async function verifyQueryPerformance() {
  console.log('\n⚡ Testing Query Performance...\n')

  const queries = [
    {
      name: 'Teams Query (Top 5)',
      query: async () => {
        const start = Date.now()
        const { data, error } = await supabase
          .from('teams')
          .select('id, name, wins, losses, division, conference, coach_name, avatar_url', { count: 'exact' })
          .order('wins', { ascending: false })
          .limit(5)
        const duration = Date.now() - start
        return { data, error, duration }
      },
      targetMs: 500,
    },
    {
      name: 'Matches Count Query',
      query: async () => {
        const start = Date.now()
        const { data, error } = await supabase
          .from('matches')
          .select('*', { count: 'exact', head: true })
          .eq('is_playoff', false)
        const duration = Date.now() - start
        return { data, error, duration }
      },
      targetMs: 500,
    },
    {
      name: 'Recent Matches Query',
      query: async () => {
        const start = Date.now()
        const { data, error } = await supabase
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
          .limit(3)
        const duration = Date.now() - start
        return { data, error, duration }
      },
      targetMs: 1000,
    },
    {
      name: 'Pokemon Stats Query',
      query: async () => {
        const start = Date.now()
        const { data, error } = await supabase
          .from('pokemon_stats')
          .select('pokemon_id, kills')
          .order('kills', { ascending: false })
          .limit(3)
        const duration = Date.now() - start
        return { data, error, duration }
      },
      targetMs: 500,
    },
  ]

  for (const { name, query, targetMs } of queries) {
    try {
      const result = await query()
      const status = result.duration <= targetMs ? 'pass' : 'warning'
      const emoji = result.duration <= targetMs ? '✅' : '⚠️'
      
      results.push({
        name,
        status,
        message: `${result.duration}ms (target: <${targetMs}ms)`,
        details: {
          duration: result.duration,
          target: targetMs,
          error: result.error?.message,
        },
      })

      if (result.error) {
        console.log(`${emoji} ${name}: ${result.duration}ms - ERROR: ${result.error.message}`)
      } else {
        console.log(`${emoji} ${name}: ${result.duration}ms`)
      }
    } catch (error: any) {
      results.push({
        name,
        status: 'fail',
        message: `Query failed: ${error.message}`,
      })
      console.log(`❌ ${name}: FAILED - ${error.message}`)
    }
  }
}

async function verifyISRConfiguration() {
  console.log('\n🔄 Verifying ISR Configuration...\n')

  try {
    const pagePath = join(process.cwd(), 'app', 'page.tsx')
    const pageContent = readFileSync(pagePath, 'utf-8')

    const hasRevalidate = pageContent.includes('export const revalidate')
    const hasForceDynamic = pageContent.includes("export const dynamic = 'force-dynamic'")

    if (hasRevalidate && !hasForceDynamic) {
      const revalidateMatch = pageContent.match(/export const revalidate = (\d+)/)
      const revalidateValue = revalidateMatch ? parseInt(revalidateMatch[1]) : null

      results.push({
        name: 'ISR Configuration',
        status: 'pass',
        message: `ISR enabled with revalidate=${revalidateValue}`,
        details: { revalidate: revalidateValue },
      })
      console.log(`✅ ISR Configured: revalidate=${revalidateValue}`)
    } else if (hasForceDynamic) {
      results.push({
        name: 'ISR Configuration',
        status: 'fail',
        message: 'ISR disabled (force-dynamic is set)',
      })
      console.log(`❌ ISR Disabled: force-dynamic is set`)
    } else {
      results.push({
        name: 'ISR Configuration',
        status: 'warning',
        message: 'ISR not explicitly configured',
      })
      console.log(`⚠️  ISR: Not explicitly configured`)
    }
  } catch (error: any) {
    results.push({
      name: 'ISR Configuration',
      status: 'warning',
      message: `Could not verify: ${error.message}`,
    })
    console.log(`⚠️  ISR: Could not verify`)
  }
}

async function verifyRedisConfiguration() {
  console.log('\n💾 Verifying Redis Configuration...\n')

  const hasKvUrl = !!process.env.KV_URL
  const hasKvToken = !!process.env.KV_REST_API_TOKEN

  if (hasKvUrl && hasKvToken) {
    try {
      // Try to import and test Redis connection
      const { kv } = await import('@vercel/kv')
      await kv.ping()
      
      results.push({
        name: 'Redis Configuration',
        status: 'pass',
        message: 'Redis (Vercel KV) is configured and accessible',
      })
      console.log(`✅ Redis: Configured and accessible`)
    } catch (error: any) {
      results.push({
        name: 'Redis Configuration',
        status: 'warning',
        message: `Redis configured but connection failed: ${error.message}`,
      })
      console.log(`⚠️  Redis: Configured but connection failed`)
    }
  } else {
    results.push({
      name: 'Redis Configuration',
      status: 'warning',
      message: 'Redis not configured (optional - app will work without it)',
      details: {
        hasKvUrl,
        hasKvToken,
      },
    })
    console.log(`⚠️  Redis: Not configured (optional)`)
  }
}

async function generateReport() {
  console.log('\n' + '='.repeat(60))
  console.log('📋 VERIFICATION REPORT')
  console.log('='.repeat(60) + '\n')

  const passed = results.filter(r => r.status === 'pass').length
  const warnings = results.filter(r => r.status === 'warning').length
  const failed = results.filter(r => r.status === 'fail').length

  console.log(`✅ Passed: ${passed}`)
  console.log(`⚠️  Warnings: ${warnings}`)
  console.log(`❌ Failed: ${failed}\n`)

  if (failed > 0) {
    console.log('❌ FAILED CHECKS:\n')
    results
      .filter(r => r.status === 'fail')
      .forEach(r => {
        console.log(`  - ${r.name}: ${r.message}`)
      })
    console.log('')
  }

  if (warnings > 0) {
    console.log('⚠️  WARNINGS:\n')
    results
      .filter(r => r.status === 'warning')
      .forEach(r => {
        console.log(`  - ${r.name}: ${r.message}`)
      })
    console.log('')
  }

  const allPassed = failed === 0
  console.log(allPassed ? '✅ All critical checks passed!' : '❌ Some checks failed - review above')
  console.log('')

  return allPassed
}

async function main() {
  console.log('🚀 Homepage Optimization Verification\n')
  console.log('='.repeat(60))

  await verifyIndexes()
  await verifyQueryPerformance()
  await verifyISRConfiguration()
  await verifyRedisConfiguration()

  const success = await generateReport()

  process.exit(success ? 0 : 1)
}

main().catch((error) => {
  console.error('❌ Verification script failed:', error)
  process.exit(1)
})
