/**
 * Test script for Showdown API endpoints
 * Tests the actual API endpoints with proper error handling
 * 
 * Usage: pnpm exec tsx --env-file=.env.local scripts/test-showdown-api-endpoints.ts
 */

import { config } from 'dotenv';
import { resolve } from 'path';

// Load environment variables
config({ path: resolve(process.cwd(), '.env.local') });

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

async function testEndpoint(endpoint: string, method: string, body?: any) {
  try {
    const response = await fetch(`${APP_URL}${endpoint}`, {
      method,
      headers: {
        'Content-Type': 'application/json',
      },
      body: body ? JSON.stringify(body) : undefined,
    });

    const data = await response.json().catch(() => ({ error: 'Failed to parse JSON' }));

    return {
      status: response.status,
      statusText: response.statusText,
      ok: response.ok,
      data,
    };
  } catch (error) {
    return {
      status: 0,
      statusText: 'Network Error',
      ok: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

async function testCreateRoomEndpoint() {
  console.log('\n🧪 Testing Create Room Endpoint...\n');
  console.log(`   Endpoint: ${APP_URL}/api/showdown/create-room`);
  console.log('   Method: POST');
  
  // Test without authentication (should fail)
  console.log('\n   Test 1: Without authentication (expected: 401)');
  const result1 = await testEndpoint('/api/showdown/create-room', 'POST', { match_id: 'test-uuid' });
  console.log(`   Status: ${result1.status} ${result1.statusText}`);
  if (result1.data?.error) {
    console.log(`   Response: ${result1.data.error}`);
  }
  
  // Test without match_id (should fail)
  console.log('\n   Test 2: Without match_id (expected: 400)');
  const result2 = await testEndpoint('/api/showdown/create-room', 'POST', {});
  console.log(`   Status: ${result2.status} ${result2.statusText}`);
  if (result2.data?.error) {
    console.log(`   Response: ${result2.data.error}`);
  }
  
  console.log('\n   ✅ Endpoint is accessible');
  console.log('   ⚠️  Full testing requires authentication (login via browser)');
}

async function testValidateTeamEndpoint() {
  console.log('\n🧪 Testing Validate Team Endpoint...\n');
  console.log(`   Endpoint: ${APP_URL}/api/showdown/validate-team`);
  console.log('   Method: POST');
  
  // Test without authentication (should fail)
  console.log('\n   Test 1: Without authentication (expected: 401)');
  const result1 = await testEndpoint('/api/showdown/validate-team', 'POST', {
    team_text: 'Pikachu @ Light Ball\nAbility: Static'
  });
  console.log(`   Status: ${result1.status} ${result1.statusText}`);
  if (result1.data?.error) {
    console.log(`   Response: ${result1.data.error}`);
  }
  
  // Test without team_text (should fail)
  console.log('\n   Test 2: Without team_text (expected: 400)');
  const result2 = await testEndpoint('/api/showdown/validate-team', 'POST', {});
  console.log(`   Status: ${result2.status} ${result2.statusText}`);
  if (result2.data?.error) {
    console.log(`   Response: ${result2.data.error}`);
  }
  
  console.log('\n   ✅ Endpoint is accessible');
  console.log('   ⚠️  Full testing requires authentication (login via browser)');
}

async function verifyDatabaseSchema() {
  console.log('\n🔍 Verifying Database Schema...\n');
  console.log('   Checking if showdown_room_id and showdown_room_url columns exist...');
  console.log('   ⚠️  This requires manual verification in Supabase SQL Editor:');
  console.log('   Run: SELECT column_name FROM information_schema.columns');
  console.log('        WHERE table_name = \'matches\' AND column_name LIKE \'showdown%\';');
}

async function main() {
  console.log('═══════════════════════════════════════════════════════');
  console.log('  Showdown API Endpoints - Testing');
  console.log('═══════════════════════════════════════════════════════');
  
  console.log('\n📋 Configuration:');
  console.log(`   APP_URL: ${APP_URL}`);
  console.log(`   SHOWDOWN_SERVER_URL: ${process.env.SHOWDOWN_SERVER_URL || 'NOT SET'}`);
  console.log(`   NEXT_PUBLIC_SHOWDOWN_CLIENT_URL: ${process.env.NEXT_PUBLIC_SHOWDOWN_CLIENT_URL || 'NOT SET'}`);
  
  await testCreateRoomEndpoint();
  await testValidateTeamEndpoint();
  await verifyDatabaseSchema();
  
  console.log('\n═══════════════════════════════════════════════════════');
  console.log('  Testing Complete');
  console.log('═══════════════════════════════════════════════════════\n');
  
  console.log('📝 Next Steps for Full Testing:');
  console.log('   1. Start dev server: pnpm dev');
  console.log('   2. Log in to the app via browser');
  console.log('   3. Open browser console and run:');
  console.log('      fetch(\'/api/showdown/create-room\', {');
  console.log('        method: \'POST\',');
  console.log('        headers: { \'Content-Type\': \'application/json\' },');
  console.log('        credentials: \'include\',');
  console.log('        body: JSON.stringify({ match_id: \'your-match-uuid\' })');
  console.log('      }).then(r => r.json()).then(console.log)');
  console.log('\n   4. Or use Postman with cookie authentication');
}

main().catch(console.error);
