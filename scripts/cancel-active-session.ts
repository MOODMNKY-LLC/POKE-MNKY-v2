/**
 * Cancel the active draft session
 * Usage: pnpm exec tsx --env-file=.env.local scripts/cancel-active-session.ts
 */

import { config } from 'dotenv';
import { resolve } from 'path';
import { createServiceRoleClient } from '../lib/supabase/service';

// Load environment variables
config({ path: resolve(process.cwd(), '.env.local') });

async function cancelActiveSession() {
  console.log('🔄 Cancelling active draft session...\n');

  const supabase = createServiceRoleClient();

  try {
    // Find active session (use .maybeSingle() to handle no results)
    const { data: activeSession, error: findError } = await supabase
      .from('draft_sessions')
      .select('id, season_id, status, current_round, current_pick_number')
      .eq('status', 'active')
      .maybeSingle();

    if (findError) {
      console.error('❌ Error finding session:', findError);
      process.exit(1);
    }

    if (!activeSession) {
      // Check if there are any sessions at all
      const { data: allSessions } = await supabase
        .from('draft_sessions')
        .select('id, status')
        .order('created_at', { ascending: false })
        .limit(5);

      if (allSessions && allSessions.length > 0) {
        console.log('📋 Found sessions (none active):');
        allSessions.forEach(s => {
          console.log(`   - ${s.id}: ${s.status}`);
        });
      } else {
        console.log('✅ No sessions found at all');
      }
      return;
    }

    console.log(`📋 Found active session: ${activeSession.id}`);
    console.log(`   Season: ${activeSession.season_id}`);
    console.log(`   Round: ${activeSession.current_round}, Pick: ${activeSession.current_pick_number}\n`);

    // Cancel the session
    const { error: updateError } = await supabase
      .from('draft_sessions')
      .update({
        status: 'cancelled',
        completed_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', activeSession.id);

    if (updateError) {
      console.error('❌ Error cancelling session:', updateError);
      process.exit(1);
    }

    console.log('✅ Session cancelled successfully!');
    console.log(`   Session ID: ${activeSession.id}`);
    console.log(`   Status: cancelled\n`);

    // Verify cancellation
    const { data: cancelledSession } = await supabase
      .from('draft_sessions')
      .select('id, status')
      .eq('id', activeSession.id)
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

cancelActiveSession();
