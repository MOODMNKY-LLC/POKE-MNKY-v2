/**
 * Cancel a specific draft session by ID
 * Usage: pnpm exec tsx --env-file=.env.local scripts/cancel-session-by-id.ts <session-id>
 */

import { config } from 'dotenv';
import { resolve } from 'path';
import { createServiceRoleClient } from '../lib/supabase/service';

// Load environment variables
config({ path: resolve(process.cwd(), '.env.local') });

const sessionId = process.argv[2];

if (!sessionId) {
  console.error('❌ Please provide a session ID');
  console.log('Usage: pnpm exec tsx --env-file=.env.local scripts/cancel-session-by-id.ts <session-id>');
  process.exit(1);
}

async function cancelSessionById() {
  console.log(`🔄 Cancelling draft session: ${sessionId}\n`);

  const supabase = createServiceRoleClient();

  try {
    // Get session first
    const { data: session, error: getError } = await supabase
      .from('draft_sessions')
      .select('id, status, season_id')
      .eq('id', sessionId)
      .single();

    if (getError || !session) {
      console.error('❌ Session not found:', getError?.message || 'No session found');
      process.exit(1);
    }

    console.log(`📋 Found session:`);
    console.log(`   ID: ${session.id}`);
    console.log(`   Status: ${session.status}`);
    console.log(`   Season: ${session.season_id}\n`);

    if (session.status === 'cancelled') {
      console.log('✅ Session is already cancelled');
      return;
    }

    // Cancel the session
    const { error: updateError } = await supabase
      .from('draft_sessions')
      .update({
        status: 'cancelled',
        completed_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', sessionId);

    if (updateError) {
      console.error('❌ Error cancelling session:', updateError);
      process.exit(1);
    }

    console.log('✅ Session cancelled successfully!\n');

    // Verify cancellation
    const { data: cancelledSession } = await supabase
      .from('draft_sessions')
      .select('id, status')
      .eq('id', sessionId)
      .single();

    if (cancelledSession?.status === 'cancelled') {
      console.log('✅ Verification: Session is now cancelled');
    } else {
      console.log('⚠️  Warning: Session status may not have updated correctly');
    }

  } catch (error: any) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

cancelSessionById();
