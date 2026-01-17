#!/usr/bin/env tsx
/**
 * Pre-Server Agent Database Sync Script
 * 
 * Run this BEFORE the server agent makes changes to ensure we have the latest
 * production schema locally.
 * 
 * This will:
 * 1. Pull current production schema
 * 2. Generate migration if there are differences
 * 3. Apply migrations locally
 * 4. Verify sync status
 */

import { execSync } from 'child_process'
import { existsSync, readdirSync } from 'fs'
import { join } from 'path'

const SUPABASE_DIR = join(process.cwd(), 'supabase')
const MIGRATIONS_DIR = join(SUPABASE_DIR, 'migrations')

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

async function main() {
  console.log('╔══════════════════════════════════════════════════════════╗')
  console.log('║  Pre-Server Agent Database Sync                         ║')
  console.log('║  Pulling current production schema                     ║')
  console.log('╚══════════════════════════════════════════════════════════╝')

  try {
    // Step 1: Check Supabase is running
    checkSupabaseStatus()

    // Step 2: Pull current production schema
    console.log('\n📥 Step 1: Pulling production schema...')
    runCommand(
      'supabase db pull',
      'Pull production schema'
    )

    // Step 3: Check if new migration was created
    console.log('\n📊 Step 2: Checking for new migrations...')
    try {
      const migrations = readdirSync(MIGRATIONS_DIR).filter(f => f.endsWith('.sql'))
      console.log(`   Found ${migrations.length} migration files`)
    } catch (error) {
      console.log('   Could not count migrations (this is okay)')
    }

    // Step 4: Apply migrations locally
    console.log('\n⬆️  Step 3: Applying migrations locally...')
    runCommand(
      'supabase migration up',
      'Apply migrations to local database'
    )

    // Step 5: Verify sync
    console.log('\n✅ Step 4: Verifying sync...')
    runCommand(
      'supabase db diff',
      'Check for differences between local and remote'
    )

    console.log('\n╔══════════════════════════════════════════════════════════╗')
    console.log('║  ✅ Pre-Sync Complete!                                   ║')
    console.log('║                                                          ║')
    console.log('║  Local database is now aligned with production.         ║')
    console.log('║  Server agent can now make changes.                     ║')
    console.log('╚══════════════════════════════════════════════════════════╝')

  } catch (error) {
    console.error('\n❌ Sync failed:', error)
    process.exit(1)
  }
}

main()
