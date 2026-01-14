# Discord Bot API Endpoints

This document lists all API endpoints that the Discord bot can use to interact with the POKE MNKY application.

**Base URL**: `https://poke-mnky.moodmnky.com` (or your `NEXT_PUBLIC_APP_URL`)

---

## Authentication

All endpoints require authentication unless otherwise specified. The Discord bot should use server-to-server authentication (service role key) for endpoints that don't require user context.

---

## League & Match Endpoints

### GET `/api/matches?week={week}`
**Description**: Get matchups for a specific week  
**Authentication**: None (public)  
**Query Parameters**:
- `week` (required): Week number

**Response**:
```json
{
  "matches": [
    {
      "id": "uuid",
      "week": 14,
      "team1": { "id": "uuid", "name": "Team A" },
      "team2": { "id": "uuid", "name": "Team B" },
      "scheduled_time": "2026-01-20T19:00:00Z",
      "status": "scheduled"
    }
  ]
}
```

**Used by**: `/matchups` command

---

### GET `/api/standings`
**Description**: Get current league standings  
**Authentication**: None (public)  
**Response**:
```json
{
  "standings": [
    {
      "name": "Team A",
      "wins": 12,
      "losses": 2,
      "differential": 45
    }
  ]
}
```

**Used by**: `/standings` command

---

## Match Result Submission

### POST `/api/ai/parse-result`
**Description**: Parse and submit a match result using AI  
**Authentication**: None (public, but rate-limited)  
**Body**:
```json
{
  "text": "Team A beat Team B 6-4"
}
```

**Response**:
```json
{
  "status": "success",
  "parsed": {
    "week": 14,
    "winner": "Team A",
    "loser": "Team B",
    "differential": 2
  }
}
```

**Error Response**:
```json
{
  "status": "needs_review",
  "message": "Could not parse result. Please submit manually."
}
```

**Used by**: `/submit` command

---

## Weekly Recap

### POST `/api/ai/weekly-recap`
**Description**: Generate AI-powered weekly recap  
**Authentication**: Admin/Commissioner role required  
**Body**:
```json
{
  "week_number": 14
}
```

**Response**:
```json
{
  "recap": "Week 14 saw intense battles as Team A extended their win streak..."
}
```

**Used by**: `/recap` command

---

## Pokémon Lookup

### GET `/api/pokemon/{pokemonName}`
**Description**: Get Pokémon information from Pokédex  
**Authentication**: None (public)  
**Path Parameters**:
- `pokemonName`: Pokémon name (e.g., "pikachu")

**Response**:
```json
{
  "name": "pikachu",
  "types": ["Electric"],
  "tier": "OU",
  "draft_cost": 15,
  "base_stats": {
    "hp": 35,
    "attack": 55,
    "defense": 40,
    "special_attack": 50,
    "special_defense": 50,
    "speed": 90
  }
}
```

**Error Response**:
```json
{
  "error": "Pokémon not found"
}
```

**Used by**: `/pokemon` command

---

## Draft System Endpoints

### GET `/api/discord/team?discord_id={discordId}`
**Description**: Get team information by Discord user ID  
**Authentication**: Service role key (server-to-server)  
**Query Parameters**:
- `discord_id` (required): Discord user ID

**Response**:
```json
{
  "team_id": "uuid",
  "team_name": "Team A",
  "coach_id": "uuid"
}
```

**Error Response**:
```json
{
  "error": "Team not found"
}
```

**Status**: ⚠️ **MISSING** - This endpoint needs to be created  
**Used by**: `/draft`, `/draft-my-team` commands

---

### GET `/api/seasons/current`
**Description**: Get the current active season  
**Authentication**: None (public)  
**Response**:
```json
{
  "season": {
    "id": "uuid",
    "name": "Season 5",
    "is_current": true,
    "start_date": "2026-01-01",
    "end_date": "2026-04-30"
  }
}
```

**Used by**: `/draft` command

---

### POST `/api/draft/pick`
**Description**: Make a draft pick  
**Authentication**: Service role key (server-to-server)  
**Body**:
```json
{
  "pokemon_name": "Pikachu",
  "team_id": "uuid",
  "season_id": "uuid"
}
```

**Response**:
```json
{
  "success": true,
  "pick": {
    "id": "uuid",
    "pokemon_name": "Pikachu",
    "point_value": 15,
    "round": 1,
    "pick_number": 5
  }
}
```

**Error Response**:
```json
{
  "success": false,
  "error": "Pokémon already drafted"
}
```

**Used by**: `/draft` command

---

### GET `/api/draft/status`
**Description**: Get current draft session status  
**Authentication**: None (public)  
**Response**:
```json
{
  "session": {
    "id": "uuid",
    "current_round": 1,
    "total_rounds": 11,
    "current_pick_number": 5,
    "status": "in_progress"
  },
  "currentTeam": {
    "id": "uuid",
    "name": "Team A"
  },
  "nextTeam": {
    "id": "uuid",
    "name": "Team B"
  }
}
```

**Used by**: `/draft-status` command

---

### GET `/api/draft/available?limit={limit}`
**Description**: Get available Pokémon for drafting  
**Authentication**: None (public)  
**Query Parameters**:
- `limit` (optional): Maximum number of results (default: 20)

**Response**:
```json
{
  "pokemon": [
    {
      "pokemon_name": "Pikachu",
      "point_value": 15
    }
  ]
}
```

**Used by**: `/draft-available` command

---

### GET `/api/draft/team-status?team_id={teamId}`
**Description**: Get team's draft status (picks and budget)  
**Authentication**: Service role key (server-to-server)  
**Query Parameters**:
- `team_id` (required): Team UUID

**Response**:
```json
{
  "budget": {
    "total": 120,
    "spent": 45,
    "remaining": 75
  },
  "picks": [
    {
      "pokemon_name": "Pikachu",
      "point_value": 15,
      "round": 1
    }
  ]
}
```

**Used by**: `/draft-my-team` command

---

## Showdown Integration

### POST `/api/showdown/sync-account-discord`
**Description**: Sync Discord user account to Showdown loginserver  
**Authentication**: Service role key (server-to-server)  
**Body**:
```json
{
  "discord_id": "123456789012345678"
}
```

**Response**:
```json
{
  "success": true,
  "showdown_username": "mood_mnky",
  "message": "Showdown account synced! Username: mood_mnky"
}
```

**Error Response**:
```json
{
  "success": false,
  "error": "User not found. Please link your Discord account in the app first."
}
```

**Used by**: `/showdown-link` command

---

## Discord Configuration Endpoints

### GET `/api/discord/config`
**Description**: Get Discord bot configuration (admin only)  
**Authentication**: Admin/Commissioner role required  
**Response**:
```json
{
  "botTokenMasked": "••••••••••••••••abcd",
  "clientId": "123456789012345678",
  "clientSecretMasked": "••••••••••••••••",
  "guildId": "123456789012345678",
  "publicKey": "abc123...",
  "supabaseUrl": "https://xxx.supabase.co"
}
```

**Used by**: Admin panel

---

### GET `/api/discord/bot-status`
**Description**: Check Discord bot status  
**Authentication**: Authenticated user  
**Response**:
```json
{
  "online": true,
  "message": "Bot token is configured"
}
```

**Used by**: Admin panel

---

### POST `/api/discord/test-webhook`
**Description**: Test a Discord webhook URL  
**Authentication**: Authenticated user  
**Body**:
```json
{
  "webhook_url": "https://discord.com/api/webhooks/..."
}
```

**Response**:
```json
{
  "success": true,
  "message": "Webhook test successful"
}
```

**Used by**: Admin panel

---

## Environment Variables Required

The Discord bot needs these environment variables:

```bash
# Application URL (required for all API calls)
NEXT_PUBLIC_APP_URL=https://poke-mnky.moodmnky.com

# Showdown Client URL (for /showdown-link command)
NEXT_PUBLIC_SHOWDOWN_CLIENT_URL=https://aab-play.moodmnky.com
```

---

## Missing Endpoint

### `/api/discord/team`
**Status**: ⚠️ **NEEDS TO BE CREATED**

This endpoint is referenced by the Discord bot but doesn't exist yet. It should:

- Accept `discord_id` as a query parameter
- Use service role key for authentication
- Query the `profiles` table by `discord_id`
- Join with `teams` table via `coaches` table
- Return team information

**Suggested Implementation**:
```typescript
// app/api/discord/team/route.ts
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const discordId = searchParams.get('discord_id')
  
  if (!discordId) {
    return NextResponse.json({ error: 'discord_id is required' }, { status: 400 })
  }
  
  const supabase = createServiceRoleClient()
  
  // Get profile by discord_id
  const { data: profile } = await supabase
    .from('profiles')
    .select('id')
    .eq('discord_id', discordId)
    .single()
  
  if (!profile) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 })
  }
  
  // Get coach by user_id
  const { data: coach } = await supabase
    .from('coaches')
    .select('id, team_id')
    .eq('user_id', profile.id)
    .single()
  
  if (!coach || !coach.team_id) {
    return NextResponse.json({ error: 'Team not found' }, { status: 404 })
  }
  
  // Get team details
  const { data: team } = await supabase
    .from('teams')
    .select('id, name')
    .eq('id', coach.team_id)
    .single()
  
  return NextResponse.json({
    team_id: team.id,
    team_name: team.name,
    coach_id: coach.id
  })
}
```

---

## Notes

1. **Service Role Key**: Endpoints that require server-to-server authentication should use `SUPABASE_SERVICE_ROLE_KEY` from environment variables.

2. **Error Handling**: All endpoints return consistent error formats:
   ```json
   {
     "error": "Error message",
     "success": false
   }
   ```

3. **Rate Limiting**: Some endpoints may have rate limiting. The bot should handle 429 responses gracefully.

4. **Base URL**: All endpoints use `NEXT_PUBLIC_APP_URL` as the base URL. Make sure this is set correctly in your bot's environment.

---

## Discord Bot Commands Reference

| Command | Endpoint Used | Auth Required |
|---------|--------------|---------------|
| `/matchups` | `GET /api/matches` | No |
| `/submit` | `POST /api/ai/parse-result` | No |
| `/standings` | `GET /api/standings` | No |
| `/recap` | `POST /api/ai/weekly-recap` | Yes (Admin) |
| `/pokemon` | `GET /api/pokemon/{name}` | No |
| `/draft` | `POST /api/draft/pick`, `GET /api/discord/team`, `GET /api/seasons/current` | Service Key |
| `/draft-status` | `GET /api/draft/status` | No |
| `/draft-available` | `GET /api/draft/available` | No |
| `/draft-my-team` | `GET /api/discord/team`, `GET /api/draft/team-status` | Service Key |
| `/showdown-link` | `POST /api/showdown/sync-account-discord` | Service Key |
