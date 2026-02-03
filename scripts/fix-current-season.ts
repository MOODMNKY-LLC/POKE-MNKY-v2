#!/usr/bin/env tsx
/**
 * Fix Current Season - Ensure only one season is marked as current
 * 
 * This script:
 * 1. Finds all seasons marked is_current = true
 * 2. Keeps the most recent one (by created_at DESC)
 * 3. Sets all others to is_current = false
 */

import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('❌ Missing Supabase configuration')
  console.error('   Required: NEXT_PUBLIC_SUPABASE_URL or SUPABASE_URL')
  console.error('   Required: SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

async function main() {
  console.log('🔧 Fixing Current Season in Supabase\n')
  console.log('='.repeat(60))
  console.log(`Supabase URL: ${SUPABASE_URL}\n`)

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

  try {
    // Get all current seasons
    const { data: currentSeasons, error: fetchError } = await supabase
      .from('seasons')
      .select('id, name, is_current, created_at')
      .eq('is_current', true)
      .order('created_at', { ascending: false })

    if (fetchError) {
      console.error('❌ Error fetching seasons:', fetchError.message)
      process.exit(1)
    }

    if (!currentSeasons || currentSeasons.length === 0) {
      console.log('⚠️  No current seasons found!')
      console.log('\n💡 To set a season as current, run:')
      console.log("   UPDATE seasons SET is_current = true WHERE name = 'Season 6';")
      return
    }

    console.log(`📋 Found ${currentSeasons.length} season(s) marked as current:`)
    currentSeasons.forEach((s, idx) => {
      console.log(`   ${idx + 1}. ${s.name} (ID: ${s.id})`)
      console.log(`      Created: ${s.created_at}`)
    })
    console.log()

    if (currentSeasons.length === 1) {
      console.log('✅ Only one current season found - no changes needed!')
      console.log(`   Current: ${currentSeasons[0].name} (${currentSeasons[0].id})`)
      return
    }

    // Keep the most recent one (first in DESC order)
    const keepSeason = currentSeasons[0]
    const seasonsToUpdate = currentSeasons.slice(1)

    console.log(`✅ Keeping: ${keepSeason.name} (${keepSeason.id})`)
    console.log(`📝 Updating ${seasonsToUpdate.length} season(s) to is_current = false:\n`)

    // Update all others to is_current = false
    for (const season of seasonsToUpdate) {
      const { error: updateError } = await supabase
        .from('seasons')
        .update({ is_current: false })
        .eq('id', season.id)

      if (updateError) {
        console.error(`   ❌ Failed to update ${season.name}:`, updateError.message)
      } else {
        console.log(`   ✅ Updated ${season.name} → is_current = false`)
      }
    }

    console.log('\n✅ Done! Only one season is now marked as current.')
    console.log(`\n📊 Current Season: ${keepSeason.name}`)
    console.log(`   ID: ${keepSeason.id}`)
    console.log(`\n💡 This ID will be used in the n8n workflow.`)

  } catch (error: any) {
    console.error(`\n❌ Error: ${error.message}`)
    if (error.stack) {
      console.error(error.stack)
    }
    process.exit(1)
  }
}

main()
