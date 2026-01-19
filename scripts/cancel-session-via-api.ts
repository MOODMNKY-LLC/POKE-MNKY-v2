/**
 * Cancel a draft session via API endpoint
 * Usage: pnpm exec tsx --env-file=.env.local scripts/cancel-session-via-api.ts <session-id>
 */

const sessionId = process.argv[2];

if (!sessionId) {
  console.error('❌ Please provide a session ID');
  console.log('Usage: pnpm exec tsx --env-file=.env.local scripts/cancel-session-via-api.ts <session-id>');
  process.exit(1);
}

async function cancelSessionViaAPI() {
  console.log(`🔄 Cancelling draft session via API: ${sessionId}\n`);

  try {
    const response = await fetch(`http://localhost:3000/api/admin/draft/sessions/${sessionId}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        status: 'cancelled',
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('❌ Error:', data.error || 'Failed to cancel session');
      process.exit(1);
    }

    console.log('✅ Session cancelled successfully!');
    console.log(`   Session ID: ${data.session?.id}`);
    console.log(`   Status: ${data.session?.status}\n`);

    // Verify cancellation
    const statusResponse = await fetch('http://localhost:3000/api/draft/status');
    const statusData = await statusResponse.json();

    if (statusData.success === false || statusData.error) {
      console.log('✅ Verification: No active session found (session cancelled)');
    } else {
      console.log('⚠️  Warning: Active session still exists');
      console.log(`   Current session: ${statusData.session?.id}`);
    }

  } catch (error: any) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

cancelSessionViaAPI();
