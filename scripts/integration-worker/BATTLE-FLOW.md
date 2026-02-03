# Integration Worker – Battle Result Flow

## Room ID format

Rooms created by the app use this format:

- **Pattern**: `battle-match-{matchId}` where `matchId` is the first 16 characters of the match UUID (hyphens removed).
- **Example**: Match UUID `a1b2c3d4-e5f6-7890-abcd-ef1234567890` → room ID `battle-match-a1b2c3d4e5f67890`.

The app sets this in `app/api/showdown/create-room/route.ts` when creating a battle room. The Integration Worker’s RoomManager subscribes to Showdown rooms; the DatabaseUpdater maps room ID back to match via `showdown_rooms` (or equivalent) to update the correct match record.

## Flow (end-to-end)

1. **Coach launches battle** in the app → `POST /api/showdown/create-room` with `match_id`.
2. **App** generates `roomId = battle-match-{cleanMatchId}`, calls Showdown server to create room, stores `showdown_room_id` / `showdown_room_url` on the match.
3. **Coach** is redirected to Showdown client; battle runs in that room.
4. **Integration Worker** (RoomManager) is subscribed to battle rooms; when the battle ends it receives a completion event.
5. **Replay parse**: Worker fetches replay for the room and parses winner, scores, differential.
6. **Update match**: Worker updates the match row (scores, winner, differential, replay_url) using room → match mapping.
7. **Update standings**: Worker recalculates/updates standings.
8. **Notify Discord**: Worker posts the result to the configured `match_results` webhook (if enabled).

## Retry and logging

- Parse replay, update match, and update standings run with **retry and exponential backoff** (max 3 attempts, 1s → 2s → 4s, capped at 10s).
- Failures are logged with room ID, step name, attempt number, and error message.
- Discord notification is best-effort; failure does not block match/standings update.
