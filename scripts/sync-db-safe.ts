#!/usr/bin/env tsx
/**
 * Safe Database Sync Script
 * 
 * Dry-run version that shows what would happen without making changes.
 * Use this to preview sync operations.
 */

import { execSync } from 'child_process'

function runCommand(command: string, description: string, dryRun = false) {
  console.log(`\n🔄 ${description}...`)
  if (dryRun) {
    console.log(`   [DRY RUN] Would run: ${command}`)
    return
  }
  
  try {
    const output = execSync(command, { 
      stdio: 'inherit',
      cwd: process.cwd(),
      encoding: 'utf-8'
    })
    console.log(`✅ ${description} completed`)
    return output
  } catch (error: any) {
    console.error(`❌ ${description} failed:`, error.message)
    throw error
  }
}

async function main() {
  const args = process.argv.slice(2)
  const dryRun = args.includes('--dry-run') || args.includes('-d')

  console.log('╔══════════════════════════════════════════════════════════╗')
  console.log('║  Safe Database Sync                                      ║')
  if (dryRun) {
    console.log('║  [DRY RUN MODE - No changes will be made]              ║')
  }
  console.log('╚══════════════════════════════════════════════════════════╝')

  try {
    // Check status
    console.log('\n📋 Checking Supabase status...')
    const status = execSync('supabase status', { encoding: 'utf-8' })
    console.log('✅ Supabase is running')

    // Check diff
    console.log('\n🔍 Checking differences...')
    try {
      const diff = execSync('supabase db diff', { encoding: 'utf-8' })
      if (diff.trim()) {
        console.log('📊 Differences found:')
        console.log(diff)
      } else {
        console.log('✅ No differences - databases are in sync')
      }
    } catch (error) {
      console.log('ℹ️  Could not check diff')
    }

    if (!dryRun) {
      console.log('\n⚠️  To actually sync, use:')
      console.log('   pnpm tsx scripts/sync-db-pre-server.ts  (before server agent)')
      console.log('   pnpm tsx scripts/sync-db-post-server.ts (after server agent)')
    }

  } catch (error) {
    console.error('\n❌ Check failed:', error)
    process.exit(1)
  }
}

main()
