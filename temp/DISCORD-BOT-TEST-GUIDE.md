# Discord Bot Testing Guide 🧪

## ✅ Prerequisites Check

- ✅ Local Supabase running (`supabase start`)
- ✅ Local cache populated (637/1025 Pokemon - enough for testing)
- ✅ `.env.local` configured with local Supabase and `http://localhost:3000`
- ✅ API routes created (`/api/standings`, `/api/matches`, `/api/pokemon/[name]`)

---

## 🚀 Start Services

### Terminal 1: Next.js App
\`\`\`bash
pnpm dev
\`\`\`
**Expected:** App starts on `http://localhost:3000`

### Terminal 2: Discord Bot
\`\`\`bash
pnpm run discord-bot:dev
\`\`\`
**Expected:** Bot logs in and shows "Discord bot logged in as..."

---

## 🧪 Test Commands

### 1. `/standings`
**Command:** `/standings`  
**Expected:** 
- If teams exist: List of top 10 teams with W-L records
- If empty: "No standings available"

**Note:** This is normal if you haven't created teams yet.

---

### 2. `/matchups week:1`
**Command:** `/matchups week:1`  
**Expected:**
- If matches exist: List of matchups for Week 1
- If empty: "No matchups found for Week 1"

**Note:** This is normal if you haven't created matches yet.

---

### 3. `/pokemon name:Pikachu`
**Command:** `/pokemon name:Pikachu`  
**Expected:** Pokemon info with:
- Name, Types, Tier, Draft Cost, Base Stat Total
- Link to full details

**Test with:**
- `/pokemon name:Pikachu`
- `/pokemon name:Charizard`
- `/pokemon name:Mewtwo`
- `/pokemon name:Garchomp`

**Note:** Should work since local cache has 637 Pokemon!

---

### 4. `/submit result:"Team A beat Team B 6-4"`
**Command:** `/submit result:"Team Fire beat Team Water 6-4"`  
**Expected:** AI-parsed result with week, winner, and KO differential

**Test with:**
- `/submit result:"Team Fire beat Team Water 6-4"`
- `/submit result:"Water Dragons defeated Electric Eels 7-3 in Week 2"`

---

### 5. `/recap week:1`
**Command:** `/recap week:1`  
**Expected:** AI-generated weekly recap

**Note:** Requires matches to exist for that week.

---

## 🐛 Troubleshooting

### Bot Not Responding
- ✅ Check bot is online in Discord
- ✅ Check Terminal 2 for bot logs
- ✅ Verify `DISCORD_BOT_TOKEN` in `.env.local`
- ✅ Restart bot: `Ctrl+C` then `pnpm run discord-bot:dev`

### "Failed to fetch standings/matchups/pokemon"
- ✅ Check Next.js is running (`pnpm dev`)
- ✅ Check Terminal 1 for errors
- ✅ Verify `NEXT_PUBLIC_APP_URL=http://localhost:3000` in `.env.local`
- ✅ Test API directly: `curl http://localhost:3000/api/standings`

### "No standings available" / "No matchups found"
- ✅ **This is normal!** Database is empty (you reset it)
- ✅ Create teams/matches via the web app or database
- ✅ Pokemon commands should work (cache has 637 Pokemon)

### Pokemon Not Found
- ✅ Check spelling (case-insensitive)
- ✅ Verify cache has that Pokemon: `psql -h 127.0.0.1 -p 54322 -U postgres -d postgres -c "SELECT name FROM pokemon_cache WHERE name ILIKE 'pikachu';"`
- ✅ Wait for full sync to complete (currently 637/1025)

---

## ✅ Success Indicators

1. **Bot Online:** Shows "Discord bot logged in as..." in Terminal 2
2. **Commands Registered:** Commands appear in Discord slash command menu
3. **Pokemon Works:** `/pokemon name:Pikachu` returns Pokemon data
4. **API Responds:** Direct API calls work (`curl http://localhost:3000/api/standings`)

---

## 📊 Current Status

| Component | Status | Notes |
|-----------|--------|-------|
| **Local Supabase** | ✅ Running | `http://127.0.0.1:54321` |
| **Local Cache** | 🔄 Populating | 637/1025 (enough for testing) |
| **Next.js App** | ⏳ Start with `pnpm dev` | Required for API routes |
| **Discord Bot** | ⏳ Start with `pnpm run discord-bot:dev` | Uses `.env.local` |
| **API Routes** | ✅ Created | `/api/standings`, `/api/matches`, `/api/pokemon/[name]` |

---

## 🎯 Quick Start

\`\`\`bash
# Terminal 1: Start Next.js
pnpm dev

# Terminal 2: Start Discord Bot
pnpm run discord-bot:dev

# Discord: Test commands
/standings
/matchups week:1
/pokemon name:Pikachu
\`\`\`

**Ready to test!** 🚀
