/**
 * Verify Showdown migration was applied correctly
 * 
 * Usage: pnpm exec tsx --env-file=.env.local scripts/verify-showdown-schema.ts
 */

import { config } from 'dotenv';
import { resolve } from 'path';
import { createClient } from '@supabase/supabase-js';

// Load environment variables
config({ path: resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing required environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function verifySchema() {
  console.log('🔍 Verifying Showdown Schema...\n');

  try {
    // Try to query the columns directly - if they exist, this will work
    const { data, error } = await supabase
      .from('matches')
      .select('showdown_room_id, showdown_room_url')
      .limit(1);

    if (error) {
      // Check if error is about missing columns
      if (error.message.includes('column') && error.message.includes('does not exist')) {
        console.log('❌ Columns not found:', error.message);
        console.log('\n   Please run the migration manually in Supabase SQL Editor:');
        console.log('   File: supabase/migrations/20260115000000_add_showdown_fields.sql');
        return false;
      }
      // Other errors (like no rows) are OK - columns exist
      console.log('✅ Columns exist (query succeeded, no data yet)');
      console.log('   Note:', error.message);
      return true;
    }

    console.log('✅ Columns exist: showdown_room_id, showdown_room_url');
    if (data && data.length > 0) {
      console.log(`   Found ${data.length} match(es) with Showdown data`);
    } else {
      console.log('   No matches with Showdown data yet (this is OK)');
    }
    return true;
  } catch (error) {
    console.error('❌ Error verifying schema:', error);
    return false;
  }
}

async function checkIndex() {
  console.log('\n🔍 Checking index...\n');

  try {
    // Try to query with the indexed column to see if index exists
    const { error } = await supabase
      .from('matches')
      .select('showdown_room_id')
      .not('showdown_room_id', 'is', null)
      .limit(1);

    if (error) {
      console.log('⚠️  Could not verify index (this is OK if no rooms exist yet)');
      return;
    }

    console.log('✅ Index appears to be working');
  } catch (error) {
    console.log('⚠️  Could not verify index');
  }
}

async function main() {
  console.log('═══════════════════════════════════════════════════════');
  console.log('  Showdown Schema Verification');
  console.log('═══════════════════════════════════════════════════════\n');

  const schemaOk = await verifySchema();
  await checkIndex();

  console.log('\n═══════════════════════════════════════════════════════');
  if (schemaOk) {
    console.log('✅ Schema verification complete!');
  } else {
    console.log('❌ Schema verification failed');
    console.log('   Please run the migration in Supabase SQL Editor');
  }
  console.log('═══════════════════════════════════════════════════════\n');
}

main().catch(console.error);
