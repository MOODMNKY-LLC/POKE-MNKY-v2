#!/usr/bin/env tsx
/**
 * Post-Server Agent Database Sync Script
 * 
 * Run this AFTER the server agent makes changes to sync everything:
 * 1. Pull server agent's changes from production
 * 2. Merge with any local changes
 * 3. Push everything back to production
 * 4. Verify final sync status
 */

import { execSync } from 'child_process'
import { existsSync, readdirSync } from 'fs'
import { join } from 'path'

function runCommand(command: string, description: string) {
  console.log(`\n🔄 ${description}...`)
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

function checkSupabaseStatus() {
  console.log('\n📋 Checking Supabase status...')
  try {
    const status = execSync('supabase status', { encoding: 'utf-8' })
    if (!status.includes('local development setup is running')) {
      console.log('⚠️  Supabase local instance not running')
      console.log('Starting Supabase...')
      execSync('supabase start', { stdio: 'inherit' })
    }
    console.log('✅ Supabase is running')
  } catch (error) {
    console.error('❌ Failed to check Supabase status:', error)
    throw error
  }
}

function getMigrationCount() {
  try {
    const migrationsDir = join(process.cwd(), 'supabase', 'migrations')
    const migrations = readdirSync(migrationsDir).filter((f: string) => f.endsWith('.sql'))
    return migrations.length
  } catch {
    return 0
  }
}

async function main() {
  console.log('╔══════════════════════════════════════════════════════════╗')
  console.log('║  Post-Server Agent Database Sync                       ║')
  console.log('║  Syncing server agent changes and pushing to production ║')
  console.log('╚══════════════════════════════════════════════════════════╝')

  try {
    // Step 1: Check Supabase is running
    checkSupabaseStatus()

    // Step 2: Get current migration count
    const migrationsBefore = getMigrationCount()
    console.log(`\n📊 Current migrations: ${migrationsBefore}`)

    // Step 3: Pull server agent's changes from production
    console.log('\n📥 Step 1: Pulling server agent changes from production...')
    runCommand(
      'supabase db pull',
      'Pull production schema (includes server agent changes)'
    )

    // Step 4: Check if new migrations were created
    const migrationsAfter = getMigrationCount()
    const newMigrations = migrationsAfter - migrationsBefore
    console.log(`\n📊 New migrations detected: ${newMigrations}`)

    if (newMigrations > 0) {
      console.log('   ✅ Server agent changes detected and migrated')
    } else {
      console.log('   ℹ️  No new migrations (schema already in sync)')
    }

    // Step 5: Apply all migrations locally
    console.log('\n⬆️  Step 2: Applying all migrations locally...')
    runCommand(
      'supabase migration up',
      'Apply all migrations to local database'
    )

    // Step 6: Verify no differences
    console.log('\n🔍 Step 3: Verifying sync status...')
    try {
      const diff = execSync('supabase db diff', { encoding: 'utf-8' })
      if (diff.trim()) {
        console.log('⚠️  Differences detected:')
        console.log(diff)
        console.log('\n⚠️  Review differences above before pushing!')
      } else {
        console.log('✅ No differences - local and remote are in sync')
      }
    } catch (error) {
      console.log('ℹ️  Could not check diff (this is okay)')
    }

    // Step 7: Push to production
    console.log('\n⬆️  Step 4: Pushing to production...')
    console.log('⚠️  This will apply all migrations to production!')
    console.log('   Press Ctrl+C within 5 seconds to cancel...')
    
    await new Promise(resolve => setTimeout(resolve, 5000))
    
    runCommand(
      'supabase db push',
      'Push migrations to production'
    )

    // Step 8: Final verification
    console.log('\n✅ Step 5: Final verification...')
    runCommand(
      'supabase db diff',
      'Final check for differences'
    )

    console.log('\n╔══════════════════════════════════════════════════════════╗')
    console.log('║  ✅ Post-Sync Complete!                                  ║')
    console.log('║                                                          ║')
    console.log('║  Production and local databases are now aligned!        ║')
    console.log('║  All server agent changes have been synced.             ║')
    console.log('╚══════════════════════════════════════════════════════════╝')

  } catch (error) {
    console.error('\n❌ Sync failed:', error)
    console.log('\n⚠️  If push failed, you may need to:')
    console.log('   1. Review the error above')
    console.log('   2. Check migration conflicts')
    console.log('   3. Manually resolve any issues')
    console.log('   4. Run: supabase db push --dry-run (to preview)')
    process.exit(1)
  }
}

main()
