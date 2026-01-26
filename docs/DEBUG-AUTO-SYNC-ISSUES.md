# Debugging Auto-Sync Issues

## Issue: Roles Not Syncing on Authentication

If you authenticated and don't see your Discord roles, check these:

### 1. Check Server Logs

Look for these log messages in your Next.js dev server terminal:

**Expected logs:**
```
[OAuth Callback] Auto-syncing Discord roles for user <user-id> (Discord: <discord-id>)
[Discord Sync] Fetching member <discord-id>...
[Discord Sync] Updated app role from spectator to <role>
```

**If you see errors:**
- `[OAuth Callback] No Discord ID found` → Profile might not be created yet
- `[OAuth Callback] Failed to auto-sync Discord roles` → Check error message
- `[Discord Sync] User not found in Discord server` → User not in Discord server

### 2. Check Database

```sql
-- Check your profile
SELECT id, display_name, role, discord_id, discord_roles, updated_at
FROM profiles
WHERE id = '<your-user-id>';

-- Should show:
-- discord_id: Your Discord ID (e.g., "132212509057875969")
-- role: Your app role (should match Discord role)
-- discord_roles: Array of Discord roles
```

### 3. Common Issues

#### Issue 1: Profile Not Created Yet
**Symptom**: `No Discord ID found` in logs
**Fix**: Added 500ms delay before sync to ensure profile trigger completes

#### Issue 2: Sync Running But Not Complete
**Symptom**: Sync starts but page loads before completion
**Fix**: Sync is async - refresh page after a few seconds, or check database directly

#### Issue 3: User Not in Discord Server
**Symptom**: `User not found in Discord server` error
**Fix**: Ensure user is in the Discord server configured in `DISCORD_GUILD_ID`

#### Issue 4: Discord Bot Not Configured
**Symptom**: `DISCORD_BOT_TOKEN is not configured` error
**Fix**: Check `.env.local` has `DISCORD_BOT_TOKEN` and `DISCORD_GUILD_ID`

### 4. Manual Verification

If auto-sync didn't work, you can manually sync:

1. Go to `/admin/discord/roles`
2. Click "Sync Now" button
3. Check logs for sync results
4. Refresh page to see updated roles

### 5. Testing Steps

1. **Reset database** (you just did this ✅)
2. **Authenticate with Discord OAuth**
3. **Check server logs** for sync messages
4. **Check database** for `discord_roles` column
5. **Refresh page** to see roles

---

**Next Steps**: Check your server logs and let me know what you see!
