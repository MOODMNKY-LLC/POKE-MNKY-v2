/**
 * Room Manager
 * Manages subscription to active battle rooms and handles completion events
 */

import { createClient } from '@supabase/supabase-js';
import { ShowdownMonitor, BattleCompletionEvent } from './showdown-monitor.js';

export class RoomManager {
  private monitor: ShowdownMonitor;
  private supabase: ReturnType<typeof createClient>;
  private pollInterval: NodeJS.Timeout | null = null;
  public onBattleComplete?: (event: BattleCompletionEvent) => Promise<void>;

  constructor(
    showdownServerUrl: string,
    supabaseUrl: string,
    supabaseKey: string
  ) {
    this.monitor = new ShowdownMonitor(showdownServerUrl);
    this.supabase = createClient(supabaseUrl, supabaseKey);

    // Set up battle completion handler
    this.monitor.onBattleComplete(async (event) => {
      if (this.onBattleComplete) {
        await this.onBattleComplete(event);
      }
    });
  }

  /**
   * Start monitoring active battle rooms
   */
  async start(): Promise<void> {
    console.log('[RoomManager] Starting room monitoring...');
    
    try {
      await this.monitor.connect();
    } catch (error) {
      console.error('[RoomManager] Failed to connect to Showdown:', error);
      throw error;
    }
    
    // Poll for new battle rooms every 30 seconds
    this.pollInterval = setInterval(() => {
      this.syncActiveRooms().catch((error) => {
        console.error('[RoomManager] Error syncing rooms:', error);
      });
    }, 30000);

    // Initial sync
    await this.syncActiveRooms();
    
    console.log('[RoomManager] Room monitoring started');
  }

  /**
   * Stop monitoring
   */
  stop(): void {
    console.log('[RoomManager] Stopping room monitoring...');
    
    if (this.pollInterval) {
      clearInterval(this.pollInterval);
      this.pollInterval = null;
    }
    
    this.monitor.disconnect();
    
    console.log('[RoomManager] Room monitoring stopped');
  }

  /**
   * Sync active battle rooms from database
   */
  private async syncActiveRooms(): Promise<void> {
    try {
      // Get all matches with active Showdown rooms
      type MatchRow = {
        id: string;
        showdown_room_id: string | null;
        status: string;
      };

      // @ts-ignore - Supabase type inference issue
      const { data: matches, error } = await this.supabase
        .from('matches')
        .select('id, showdown_room_id, status')
        .eq('status', 'in_progress')
        .not('showdown_room_id', 'is', null) as { data: MatchRow[] | null; error: any };

      if (error) {
        console.error('[RoomManager] Error fetching active rooms:', error);
        return;
      }

      if (!matches || matches.length === 0) {
        // Unsubscribe from all rooms if no active matches
        for (const roomId of Array.from(this.monitor.roomSubscriptions)) {
          this.monitor.unsubscribeFromRoom(roomId);
        }
        return;
      }

      // Subscribe to all active rooms
      const activeRoomIds = new Set<string>();
      for (const match of matches) {
        if (match.showdown_room_id) {
          activeRoomIds.add(match.showdown_room_id);
          
          if (!this.monitor.roomSubscriptions.has(match.showdown_room_id)) {
            try {
              this.monitor.subscribeToRoom(match.showdown_room_id);
            } catch (error) {
              console.error(`[RoomManager] Failed to subscribe to room ${match.showdown_room_id}:`, error);
            }
          }
        }
      }

      // Unsubscribe from rooms that are no longer active
      for (const roomId of Array.from(this.monitor.roomSubscriptions)) {
        if (!activeRoomIds.has(roomId)) {
          this.monitor.unsubscribeFromRoom(roomId);
        }
      }

      console.log(`[RoomManager] Synced ${activeRoomIds.size} active rooms`);
    } catch (error) {
      console.error('[RoomManager] Error syncing rooms:', error);
    }
  }
}
