/**
 * Test script for Showdown API endpoints
 * 
 * Usage: pnpm exec tsx --env-file=.env.local scripts/test-showdown-endpoints.ts
 */

import { config } from 'dotenv';
import { resolve } from 'path';

// Load environment variables
config({ path: resolve(process.cwd(), '.env.local') });

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
const SHOWDOWN_SERVER_URL = process.env.SHOWDOWN_SERVER_URL;
const SHOWDOWN_CLIENT_URL = process.env.NEXT_PUBLIC_SHOWDOWN_CLIENT_URL;

async function testShowdownServer() {
  console.log('\n🧪 Testing Showdown Server Connection...\n');
  
  if (!SHOWDOWN_SERVER_URL) {
    console.log('❌ SHOWDOWN_SERVER_URL not set');
    return;
  }

  try {
    const response = await fetch(SHOWDOWN_SERVER_URL, {
      method: 'HEAD',
      signal: AbortSignal.timeout(5000)
    });
    
    console.log(`✅ Showdown Server (${SHOWDOWN_SERVER_URL}):`);
    console.log(`   Status: ${response.status} ${response.statusText}`);
    console.log(`   Accessible: ${response.ok ? 'Yes' : 'No'}`);
  } catch (error) {
    console.log(`❌ Showdown Server (${SHOWDOWN_SERVER_URL}):`);
    console.log(`   Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

async function testShowdownClient() {
  console.log('\n🧪 Testing Showdown Client Connection...\n');
  
  if (!SHOWDOWN_CLIENT_URL) {
    console.log('❌ NEXT_PUBLIC_SHOWDOWN_CLIENT_URL not set');
    return;
  }

  try {
    const response = await fetch(SHOWDOWN_CLIENT_URL, {
      method: 'HEAD',
      signal: AbortSignal.timeout(5000)
    });
    
    console.log(`✅ Showdown Client (${SHOWDOWN_CLIENT_URL}):`);
    console.log(`   Status: ${response.status} ${response.statusText}`);
    console.log(`   Accessible: ${response.ok ? 'Yes' : 'No'}`);
  } catch (error) {
    console.log(`❌ Showdown Client (${SHOWDOWN_CLIENT_URL}):`);
    console.log(`   Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

async function testCreateRoomEndpoint() {
  console.log('\n🧪 Testing Create Room Endpoint...\n');
  console.log('⚠️  This requires authentication and a valid match_id');
  console.log('   Skipping actual API call (requires auth token)');
  console.log(`   Endpoint: ${APP_URL}/api/showdown/create-room`);
  console.log('   Method: POST');
  console.log('   Body: { "match_id": "uuid" }');
}

async function testValidateTeamEndpoint() {
  console.log('\n🧪 Testing Validate Team Endpoint...\n');
  console.log('⚠️  This requires authentication');
  console.log('   Skipping actual API call (requires auth token)');
  console.log(`   Endpoint: ${APP_URL}/api/showdown/validate-team`);
  console.log('   Method: POST');
  console.log('   Body: { "team_text": "Pikachu @ Light Ball\\n..." }');
}

async function main() {
  console.log('═══════════════════════════════════════════════════════');
  console.log('  Showdown Integration - Endpoint Testing');
  console.log('═══════════════════════════════════════════════════════');
  
  console.log('\n📋 Environment Variables:');
  console.log(`   SHOWDOWN_SERVER_URL: ${SHOWDOWN_SERVER_URL || 'NOT SET'}`);
  console.log(`   NEXT_PUBLIC_SHOWDOWN_CLIENT_URL: ${SHOWDOWN_CLIENT_URL || 'NOT SET'}`);
  console.log(`   SHOWDOWN_API_KEY: ${process.env.SHOWDOWN_API_KEY ? 'SET' : 'NOT SET'}`);
  console.log(`   APP_URL: ${APP_URL}`);
  
  await testShowdownServer();
  await testShowdownClient();
  await testCreateRoomEndpoint();
  await testValidateTeamEndpoint();
  
  console.log('\n═══════════════════════════════════════════════════════');
  console.log('  Testing Complete');
  console.log('═══════════════════════════════════════════════════════\n');
  
  console.log('📝 Next Steps:');
  console.log('   1. Run database migration: supabase/migrations/20260115000000_add_showdown_fields.sql');
  console.log('   2. Test endpoints with authenticated requests');
  console.log('   3. Verify room creation works with actual match IDs');
}

main().catch(console.error);
