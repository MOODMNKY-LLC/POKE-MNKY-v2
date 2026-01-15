# Discord Bot Fix - API Routes Created

## ✅ Fixed Issues

### Missing API Routes Created

1. **`/api/standings`** - GET endpoint for league standings
   - Returns teams ordered by wins and differential
   - Format: `{ standings: [...] }`

2. **`/api/matches`** - GET endpoint for matchups
   - Accepts `?week=N` query parameter
   - Returns matches with team details
   - Format: `{ matches: [...] }`

3. **`/api/pokemon/[name]`** - GET endpoint for Pokemon lookup
   - Accepts Pokemon name in URL path
   - Returns Pokemon data from cache or fetches if missing
   - Format: `{ pokemon_id, name, types, base_stats, ... }`

## 🔄 Next Steps

### 1. Restart Discord Bot
The bot needs to be restarted to pick up any changes. If it's running, stop and restart:

\`\`\`bash
# Stop current bot (Ctrl+C in terminal)
# Then restart:
pnpm run discord-bot:dev
\`\`\`

### 2. Start Next.js App
The API routes require the Next.js app to be running:

\`\`\`bash
# In a separate terminal:
pnpm dev
\`\`\`

The app should start on `http://localhost:3000`

### 3. Test Discord Commands

Once both are running:

\`\`\`
/standings
/matchups week:1
/pokemon name:Pikachu
\`\`\`

## ⚠️ Important Notes

- **Database Reset**: Since you reset the database, there may be no teams or matches yet
- **Empty Results**: Commands will return "No standings available" or "No matchups found" if database is empty
- **Pokemon Cache**: Pokemon cache should still have data (1,025 Pokemon cached)
- **API Endpoints**: All endpoints use service role key for database access (no auth required for Discord bot)

## 🐛 Troubleshooting

### "Failed to fetch standings"
- Check if Next.js app is running (`pnpm dev`)
- Check if `teams` table has data
- Verify `NEXT_PUBLIC_APP_URL` is set to `http://localhost:3000`

### "Failed to fetch matchups"
- Check if `matches` table has data
- Verify week parameter is valid number
- Check database connection

### "Failed to fetch Pokémon data"
- Check if `pokemon_cache` table has data
- Verify Pokemon name spelling (case-insensitive)
- Check if cache expired (should be valid for 30 days)

### Bot Not Responding
- Restart bot: `pnpm run discord-bot:dev`
- Check bot logs for errors
- Verify Discord bot token is valid
- Check if bot is online in Discord

## 📝 API Route Details

### `/api/standings`
- **Method**: GET
- **Auth**: None (uses service role)
- **Response**: `{ standings: Team[] }`
- **Team Format**: `{ name, wins, losses, differential, current_streak, streak_type }`

### `/api/matches`
- **Method**: GET
- **Query Params**: `?week=N` (optional)
- **Auth**: None (uses service role)
- **Response**: `{ matches: Match[] }`
- **Match Format**: Includes team1, team2, winner relations

### `/api/pokemon/[name]`
- **Method**: GET
- **Path Params**: `name` (Pokemon name, URL encoded)
- **Auth**: None (uses service role)
- **Response**: `{ pokemon_id, name, types, base_stats, ... }`
- **Cache**: Uses `pokemon_cache` table, fetches from API if missing
