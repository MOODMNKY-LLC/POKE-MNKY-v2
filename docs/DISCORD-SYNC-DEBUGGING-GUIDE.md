# Discord Role Sync Debugging Guide

## Issue: "Sync Now" Button Spins Forever

### Symptoms
- Clicking "Sync Now" button shows loading spinner
- No success/error message appears
- No feedback to user

### Enhanced Logging Added

I've added comprehensive logging throughout the sync process. Check these locations:

#### 1. Browser Console (F12 → Console)
Look for logs prefixed with `[Discord Roles UI]`:
- `[Discord Roles UI] Starting sync...`
- `[Discord Roles UI] Response received after Xms, status: XXX`
- `[Discord Roles UI] Response data: {...}`
- `[Discord Roles UI] Sync successful/error: ...`

#### 2. Server Terminal/Logs (Next.js dev server)
Look for logs prefixed with `[Discord Sync API]`:
- `[Discord Sync API] Starting role sync...`
- `[Discord Sync API] Verifying admin access...`
- `[Discord Sync API] User authenticated: ...`
- `[Discord Sync API] Checking environment variables...`
- `[Discord Sync API] Environment variables OK, starting sync...`
- `[Discord Sync API] Sync completed in Xms: ...`

#### 3. Discord Client Logs
Look for logs prefixed with `[Discord Sync]`:
- `[Discord Sync] Starting bulk sync...`
- `[Discord Sync] Getting Discord guild...`
- `[Discord Sync] Creating Discord client...`
- `[Discord Sync] Client logged in successfully`
- `[Discord Sync] Guild fetched: ...`
- `[Discord Sync] Found X Discord members`
- `[Discord Sync] Processed X/Y members...`
- `[Discord Sync] Bulk sync complete: {...}`

### Common Issues & Solutions

#### Issue 1: Missing Environment Variables
**Symptoms:**
- Error: "Discord bot not configured"
- Logs show: `hasBotToken: false` or `hasGuildId: false`

**Solution:**
1. Check `.env.local` has:
   - `DISCORD_BOT_TOKEN=your_token`
   - `DISCORD_GUILD_ID=your_guild_id`
2. Restart Next.js dev server after adding variables

#### Issue 2: Discord Client Creation Hanging
**Symptoms:**
- Logs stop at: `[Discord Sync] Creating Discord client...`
- No "Client logged in successfully" message
- Request times out after 60 seconds

**Possible Causes:**
- Invalid `DISCORD_BOT_TOKEN`
- Network issues connecting to Discord
- Bot token expired or revoked

**Solution:**
1. Verify bot token in Discord Developer Portal
2. Check bot is in your Discord server
3. Verify bot has "View Server Members" permission

#### Issue 3: Guild Fetch Failing
**Symptoms:**
- Logs stop at: `[Discord Sync] Fetching guild...`
- Error: "Unknown Guild" or similar

**Possible Causes:**
- Invalid `DISCORD_GUILD_ID`
- Bot not in server
- Bot lacks permissions

**Solution:**
1. Get correct Guild ID (right-click server → Copy Server ID)
2. Ensure bot is in the server
3. Ensure bot has "View Server" permission

#### Issue 4: Member Fetch Taking Too Long
**Symptoms:**
- Logs show: `Found X Discord members`
- Then hangs for a long time
- May timeout

**Possible Causes:**
- Large Discord server (many members)
- Rate limiting from Discord API
- Network issues

**Solution:**
- This is normal for large servers
- Added 60-second timeout
- Progress logs every 10 members

#### Issue 5: API Route Timeout
**Symptoms:**
- Request takes > 60 seconds
- Error: "Sync timeout after 60 seconds"

**Solution:**
- This is expected for very large servers
- Consider syncing in batches
- Check server size (if > 1000 members, may need optimization)

### Debugging Steps

1. **Check Browser Console**
   ```javascript
   // Open browser console (F12)
   // Look for [Discord Roles UI] logs
   ```

2. **Check Server Logs**
   ```bash
   # In terminal where Next.js is running
   # Look for [Discord Sync API] and [Discord Sync] logs
   ```

3. **Verify Environment Variables**
   ```bash
   # Check .env.local exists and has:
   grep DISCORD_BOT_TOKEN .env.local
   grep DISCORD_GUILD_ID .env.local
   ```

4. **Test Discord Connection**
   ```bash
   # Use Discord API directly to test token
   curl -H "Authorization: Bot YOUR_BOT_TOKEN" \
        https://discord.com/api/v10/guilds/YOUR_GUILD_ID
   ```

5. **Check Bot Permissions**
   - Go to Discord Server Settings → Members
   - Find your bot
   - Verify it has necessary permissions

### Expected Log Flow

**Successful Sync:**
```
[Discord Roles UI] Starting sync...
[Discord Sync API] Starting role sync...
[Discord Sync API] Verifying admin access...
[Discord Sync API] User authenticated: <user-id>
[Discord Sync API] User role: admin
[Discord Sync API] Checking environment variables...
[Discord Sync API] Environment variables OK, starting sync...
[Discord Sync] Starting bulk sync...
[Discord Sync] Getting Discord guild...
[Discord Sync] Creating Discord client...
[Discord Sync] Client logged in successfully
[Discord Sync] Guild fetched: Server Name (guild-id)
[Discord Sync] Found X Discord members
[Discord Sync] Processed 10/X members...
[Discord Sync] Processed 20/X members...
...
[Discord Sync] Bulk sync complete: {updated: X, skipped: Y, errors: Z}
[Discord Sync API] Sync completed in Xms: {...}
[Discord Roles UI] Response received after Xms, status: 200
[Discord Roles UI] Sync successful: {...}
```

### Error Patterns

**Pattern 1: Stops at Client Creation**
```
[Discord Sync] Creating Discord client...
[No further logs]
```
→ Check `DISCORD_BOT_TOKEN`

**Pattern 2: Stops at Guild Fetch**
```
[Discord Sync] Client logged in successfully
[Discord Sync] Fetching guild...
[No further logs]
```
→ Check `DISCORD_GUILD_ID` and bot permissions

**Pattern 3: Stops at Member Fetch**
```
[Discord Sync] Guild fetched: ...
[Discord Sync] Fetching members...
[No further logs]
```
→ Large server, may take time (normal)

**Pattern 4: Error in Sync Loop**
```
[Discord Sync] Processed 10/X members...
[Discord Sync] Error syncing <discord-id>: ...
```
→ Check specific Discord ID for issues

### Next Steps

After checking logs:
1. Identify where the process stops
2. Check the specific error message
3. Verify the configuration for that step
4. Test with a smaller subset if needed

### Performance Notes

- **Small servers (< 100 members)**: Should complete in < 5 seconds
- **Medium servers (100-500 members)**: Should complete in 5-15 seconds
- **Large servers (500+ members)**: May take 15-60 seconds
- **Timeout**: Set to 60 seconds (can be increased if needed)

---

**Last Updated**: 2026-01-25  
**Status**: Enhanced logging added, ready for debugging
