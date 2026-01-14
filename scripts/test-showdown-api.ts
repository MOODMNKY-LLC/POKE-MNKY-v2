/**
 * Test script to check if Showdown server API endpoint exists
 * Run with: pnpm tsx scripts/test-showdown-api.ts
 */

const SHOWDOWN_SERVER_URL = process.env.SHOWDOWN_SERVER_URL || 'https://aab-showdown.moodmnky.com';
const SHOWDOWN_API_KEY = process.env.SHOWDOWN_API_KEY || '';

async function testCreateRoomEndpoint() {
  console.log(`\n🔍 Testing Showdown Server API: ${SHOWDOWN_SERVER_URL}/api/create-room\n`);

  const testPayload = {
    roomId: 'test-room-123',
    format: 'gen9avgatbest',
    team1: 'Test Team 1',
    team2: 'Test Team 2',
    matchId: 'test-match-id'
  };

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  if (SHOWDOWN_API_KEY) {
    headers['Authorization'] = `Bearer ${SHOWDOWN_API_KEY}`;
  }

  try {
    console.log('📤 Sending POST request...');
    console.log('Payload:', JSON.stringify(testPayload, null, 2));
    console.log('Headers:', JSON.stringify(headers, null, 2));

    const response = await fetch(`${SHOWDOWN_SERVER_URL}/api/create-room`, {
      method: 'POST',
      headers,
      body: JSON.stringify(testPayload),
    });

    console.log(`\n📥 Response Status: ${response.status} ${response.statusText}`);

    const contentType = response.headers.get('content-type');
    console.log(`Content-Type: ${contentType}`);

    let responseBody: any;
    if (contentType?.includes('application/json')) {
      responseBody = await response.json();
      console.log('\n📄 Response Body:', JSON.stringify(responseBody, null, 2));
    } else {
      const text = await response.text();
      console.log('\n📄 Response Body (text):', text);
    }

    if (response.ok) {
      console.log('\n✅ SUCCESS: Showdown server API endpoint exists and responded!');
      return true;
    } else {
      console.log(`\n⚠️  WARNING: Endpoint exists but returned error status ${response.status}`);
      return false;
    }
  } catch (error: any) {
    console.log('\n❌ ERROR: Failed to reach endpoint');
    console.log('Error:', error.message);
    
    if (error.code === 'ENOTFOUND' || error.code === 'ECONNREFUSED') {
      console.log('\n💡 This likely means:');
      console.log('   - The endpoint does not exist on the Showdown server');
      console.log('   - The server is not accessible');
      console.log('   - Network/firewall issue');
    }

    return false;
  }
}

async function testServerRoot() {
  console.log(`\n🔍 Testing Showdown Server Root: ${SHOWDOWN_SERVER_URL}\n`);

  try {
    const response = await fetch(SHOWDOWN_SERVER_URL, {
      method: 'GET',
    });

    console.log(`Status: ${response.status} ${response.statusText}`);
    console.log(`Content-Type: ${response.headers.get('content-type')}`);

    if (response.ok) {
      console.log('✅ Server is accessible');
      return true;
    }
  } catch (error: any) {
    console.log(`❌ Cannot reach server: ${error.message}`);
    return false;
  }
}

async function main() {
  console.log('='.repeat(60));
  console.log('Showdown Server API Endpoint Test');
  console.log('='.repeat(60));

  // Test server root first
  const serverAccessible = await testServerRoot();

  if (!serverAccessible) {
    console.log('\n⚠️  Cannot reach server root. Check:');
    console.log('   - Is the server running?');
    console.log('   - Is the URL correct?');
    console.log('   - Is Cloudflare Tunnel configured?');
    return;
  }

  // Test API endpoint
  const endpointExists = await testCreateRoomEndpoint();

  console.log('\n' + '='.repeat(60));
  console.log('Summary');
  console.log('='.repeat(60));
  
  if (endpointExists) {
    console.log('✅ Showdown server API endpoint EXISTS');
    console.log('   Your app can use it for room pre-creation');
  } else {
    console.log('⚠️  Showdown server API endpoint DOES NOT EXIST');
    console.log('   Your app will fall back to local room URL generation');
    console.log('   This is fine - rooms will be created when users join');
    console.log('\n💡 To implement the endpoint:');
    console.log('   - Add POST /api/create-room handler to Showdown server');
    console.log('   - Accept the payload format shown above');
    console.log('   - Return { room_id, room_url } on success');
  }

  console.log('\n');
}

main().catch(console.error);
