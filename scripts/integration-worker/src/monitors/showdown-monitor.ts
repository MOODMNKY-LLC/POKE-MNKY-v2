/**
 * Showdown WebSocket Monitor
 * Monitors Showdown battle rooms for completion events
 */

import WebSocket from 'ws';

export interface BattleCompletionEvent {
  roomId: string;
  winner: 'p1' | 'p2' | null; // null for tie
  isTie: boolean;
  isForfeit: boolean;
  timestamp: Date;
}

export class ShowdownMonitor {
  private ws: WebSocket | null = null;
  private reconnectTimer: NodeJS.Timeout | null = null;
  public roomSubscriptions = new Set<string>();
  private onBattleCompleteCallback?: (event: BattleCompletionEvent) => void;

  constructor(
    private serverUrl: string,
    private reconnectDelay: number = 5000
  ) {}

  /**
   * Connect to Showdown server WebSocket
   */
  async connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      // Convert HTTP/HTTPS URL to WebSocket URL
      const wsUrl = this.serverUrl
        .replace(/^https:/, 'wss:')
        .replace(/^http:/, 'ws:')
        .replace(/\/$/, '') + '/showdown/websocket';

      console.log(`[ShowdownMonitor] Connecting to ${wsUrl}...`);

      this.ws = new WebSocket(wsUrl);

      this.ws.on('open', () => {
        console.log('[ShowdownMonitor] Connected to Showdown server');
        if (this.reconnectTimer) {
          clearTimeout(this.reconnectTimer);
          this.reconnectTimer = null;
        }
        resolve();
      });

      this.ws.on('message', (data: WebSocket.Data) => {
        this.handleMessage(data.toString());
      });

      this.ws.on('error', (error) => {
        console.error('[ShowdownMonitor] WebSocket error:', error);
        if (!this.reconnectTimer) {
          reject(error);
        }
      });

      this.ws.on('close', () => {
        console.log('[ShowdownMonitor] WebSocket closed');
        if (!this.reconnectTimer) {
          this.scheduleReconnect();
        }
      });
    });
  }

  /**
   * Subscribe to battle room events
   */
  subscribeToRoom(roomId: string): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      throw new Error('WebSocket not connected');
    }

    // Join room: |/join {roomId}
    this.ws.send(`|/join ${roomId}`);
    this.roomSubscriptions.add(roomId);
    console.log(`[ShowdownMonitor] Subscribed to room: ${roomId}`);
  }

  /**
   * Unsubscribe from battle room
   */
  unsubscribeFromRoom(roomId: string): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      return;
    }

    // Leave room: |/leave {roomId}
    this.ws.send(`|/leave ${roomId}`);
    this.roomSubscriptions.delete(roomId);
    console.log(`[ShowdownMonitor] Unsubscribed from room: ${roomId}`);
  }

  /**
   * Set callback for battle completion events
   */
  onBattleComplete(callback: (event: BattleCompletionEvent) => void): void {
    this.onBattleCompleteCallback = callback;
  }

  /**
   * Handle incoming WebSocket messages
   */
  private handleMessage(message: string): void {
    // Showdown protocol format: {roomId}|{command}|{args...}
    // Room ID format: >{roomId} (with > prefix for room messages)
    const lines = message.split('\n');
    
    for (const line of lines) {
      if (!line.trim()) continue;
      
      const parts = line.split('|');
      if (parts.length < 2) continue;

      let roomId = parts[0];
      const command = parts[1];

      // Strip '>' prefix from room ID if present
      if (roomId.startsWith('>')) {
        roomId = roomId.substring(1);
      }

      // Debug: Log ALL battle completion events (even if room ID seems wrong)
      if (command === 'win' || command === 'tie' || command === 'draw' || 
          command === 'forcewin' || command === 'forfeit') {
        console.log(`[ShowdownMonitor] DEBUG: Raw line: ${line}`);
        console.log(`[ShowdownMonitor] DEBUG: Parts[0] (roomId): "${parts[0]}"`);
        console.log(`[ShowdownMonitor] DEBUG: Processed roomId: "${roomId}"`);
        console.log(`[ShowdownMonitor] DEBUG: Command: ${command}`);
        console.log(`[ShowdownMonitor] DEBUG: Subscribed rooms:`, Array.from(this.roomSubscriptions));
        
        // If roomId is empty or not in subscriptions, try to find it from subscribed rooms
        if (!roomId || !this.roomSubscriptions.has(roomId)) {
          // Try to match from subscribed rooms
          const subscribedRooms = Array.from(this.roomSubscriptions);
          if (subscribedRooms.length === 1) {
            roomId = subscribedRooms[0];
            console.log(`[ShowdownMonitor] DEBUG: Using subscribed room ID: ${roomId}`);
          }
        }
      }

      // Debug: Log messages from subscribed rooms
      if (this.roomSubscriptions.has(roomId)) {
        // Only log important events to avoid spam
        if (command === 'win' || command === 'tie' || command === 'draw' || 
            command === 'forcewin' || command === 'forfeit' ||
            command === 'init' || command === 'users' || command === 'player') {
          console.log(`[ShowdownMonitor] Message from ${roomId}: ${command} ${parts.slice(2).join('|').substring(0, 50)}`);
        }
      }

      // Check if this is a battle completion event
      if (command === 'win' || command === 'tie' || command === 'draw' || 
          command === 'forcewin' || command === 'forfeit') {
        console.log(`[ShowdownMonitor] DEBUG: Completion event detected. Raw line: "${line}"`);
        console.log(`[ShowdownMonitor] DEBUG: Parts:`, parts);
        console.log(`[ShowdownMonitor] DEBUG: parts[0] (roomId): "${parts[0]}"`);
        console.log(`[ShowdownMonitor] DEBUG: command: "${command}"`);
        console.log(`[ShowdownMonitor] DEBUG: Subscribed rooms:`, Array.from(this.roomSubscriptions));
        
        // Ensure we have a valid room ID
        if (!roomId || !this.roomSubscriptions.has(roomId)) {
          const subscribedRooms = Array.from(this.roomSubscriptions);
          if (subscribedRooms.length === 1) {
            console.log(`[ShowdownMonitor] DEBUG: Using fallback - subscribed room: ${subscribedRooms[0]}`);
            roomId = subscribedRooms[0];
          } else {
            console.error(`[ShowdownMonitor] ERROR: Cannot determine room ID for completion event. Raw: "${parts[0]}", Processed: "${roomId}", Subscribed:`, subscribedRooms);
            return; // Skip if we can't determine the room
          }
        }
        
        console.log(`[ShowdownMonitor] DEBUG: Final roomId for completion: "${roomId}"`);
        this.handleBattleCompletion(roomId, command, parts.slice(2));
      }
    }
  }

  /**
   * Handle battle completion events
   */
  private handleBattleCompletion(roomId: string, command: string, args: string[]): void {
    if (!this.onBattleCompleteCallback) return;

    let winner: 'p1' | 'p2' | null = null;
    let isTie = false;
    let isForfeit = false;

    if (command === 'win' || command === 'forcewin') {
      // |win|p1 or |win|PlayerName
      const winnerArg = args[0] || '';
      if (winnerArg === 'p1' || winnerArg.startsWith('p1')) {
        winner = 'p1';
      } else if (winnerArg === 'p2' || winnerArg.startsWith('p2')) {
        winner = 'p2';
      }
    } else if (command === 'tie' || command === 'draw') {
      isTie = true;
    } else if (command === 'forfeit') {
      isForfeit = true;
      // Forfeit usually means the other player wins
      // We'll need to check replay to determine actual winner
    }

    const event: BattleCompletionEvent = {
      roomId,
      winner,
      isTie,
      isForfeit,
      timestamp: new Date(),
    };

    console.log(`[ShowdownMonitor] Battle completed in ${roomId}:`, {
      winner: event.winner,
      isTie: event.isTie,
      isForfeit: event.isForfeit,
    });
    
    this.onBattleCompleteCallback(event);
  }

  /**
   * Schedule reconnection attempt
   */
  private scheduleReconnect(): void {
    if (this.reconnectTimer) return;

    this.reconnectTimer = setTimeout(() => {
      console.log('[ShowdownMonitor] Attempting to reconnect...');
      this.reconnectTimer = null;
      this.connect().catch((error) => {
        console.error('[ShowdownMonitor] Reconnection failed:', error);
        this.scheduleReconnect();
      });
    }, this.reconnectDelay);
  }

  /**
   * Disconnect from WebSocket
   */
  disconnect(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }

    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }

    this.roomSubscriptions.clear();
    console.log('[ShowdownMonitor] Disconnected');
  }
}
