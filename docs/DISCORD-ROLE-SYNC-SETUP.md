# Discord Role Sync Setup Guide

## Quick Start

Your Discord role sync is **fully implemented** and ready to use! Follow these steps to configure it.

---

## 1. Configure Discord Role Names

Edit `lib/discord-role-sync.ts` and update the role mappings to match your Discord server:

```typescript
// Discord → App mapping
export const DISCORD_TO_APP_ROLE_MAP: Record<string, UserRole> = {
  "Commissioner": "admin",        // ← Change to your Discord role name
  "League Admin": "admin",       // ← Change to your Discord role name
  "Coach": "coach",              // ← Change to your Discord role name
  "Spectator": "viewer",         // ← Change to your Discord role name
}

// App → Discord mapping
export const APP_TO_DISCORD_ROLE_MAP: Record<UserRole, string[]> = {
  admin: ["Commissioner", "League Admin"],  // ← Change to your Discord role names
  commissioner: ["Commissioner"],            // ← Change to your Discord role name
  coach: ["Coach"],                          // ← Change to your Discord role name
  viewer: ["Spectator"],                      // ← Change to your Discord role name
}
```

**Important:** Role names are **case-sensitive** and must match exactly!

---

## 2. Ensure Discord Roles Exist

Make sure these roles exist in your Discord server:
- ✅ Commissioner (or League Admin)
- ✅ Coach
- ✅ Spectator

**Note:** The bot needs "Manage Roles" permission to assign/remove roles.

---

## 3. Environment Variables

Ensure these are set in your `.env` file:

```env
DISCORD_BOT_TOKEN=your_bot_token_here
DISCORD_GUILD_ID=your_server_id_here
```

---

## 4. How It Works

### Discord → App Sync (Manual)

1. Go to `/admin/discord/roles`
2. Click "Sync Now" button
3. System fetches all Discord server members
4. Maps Discord roles to app roles
5. Updates user profiles in database
6. Shows results: "Synced X users, Y unchanged, Z errors"

### App → Discord Sync (Automatic)

1. Admin changes user role in `/admin/users`
2. App role is updated in database
3. **Automatically** syncs to Discord (if user has Discord account linked)
4. Updates Discord member roles
5. Non-blocking (if Discord sync fails, app role update still succeeds)

---

## 5. Testing

### Test Discord → App Sync

1. Assign a Discord role to a user in Discord
2. Go to `/admin/discord/roles`
3. Click "Sync Now"
4. Check `/admin/users` - user's app role should update

### Test App → Discord Sync

1. Go to `/admin/users`
2. Change a user's role (must have Discord account linked)
3. Check Discord server - user's Discord roles should update
4. Check browser console for any sync errors (non-critical)

---

## 6. Troubleshooting

### "User not found in Discord server"
- User hasn't joined your Discord server
- Discord ID in database doesn't match Discord user ID
- Solution: User must join server and link Discord account via OAuth

### "Discord roles not found"
- Role names in code don't match Discord server role names
- Solution: Update `DISCORD_TO_APP_ROLE_MAP` and `APP_TO_DISCORD_ROLE_MAP` in `lib/discord-role-sync.ts`

### "DISCORD_BOT_TOKEN is not configured"
- Missing environment variable
- Solution: Add `DISCORD_BOT_TOKEN` to `.env` file

### "Forbidden - Admin access required"
- Non-admin user trying to sync
- Solution: Only admins can trigger sync

### Discord sync fails silently
- This is intentional - app role update succeeds even if Discord sync fails
- Check browser console for error details
- Common causes: Bot doesn't have "Manage Roles" permission, role hierarchy issues

---

## 7. Role Priority

When syncing Discord → App, roles are checked in this priority order:
1. **admin** (highest priority)
2. **commissioner**
3. **coach**
4. **viewer** (default)

If a user has multiple Discord roles, the highest priority app role is assigned.

---

## 8. Activity Logging

All role syncs are logged to `user_activity_log` table:
- `discord_role_sync` - Discord → App sync
- `discord_role_updated_from_app` - App → Discord sync
- `update_user_role` - Manual role change in admin dashboard

---

## 9. Security Notes

- ✅ Admin-only access for sync endpoints
- ✅ Service role client used for database updates (bypasses RLS)
- ✅ Activity logging for audit trail
- ✅ Non-blocking Discord sync (doesn't break app if Discord fails)
- ✅ Error handling prevents exposing sensitive Discord API errors

---

## 10. Next Steps (Optional)

Consider implementing **real-time bot integration** for automatic sync:
- Bot listens for Discord role changes
- Automatically syncs to app when Discord roles change
- See "Option B" in `docs/RBAC-ANALYSIS-AND-DISCORD-SYNC.md`

---

## Support

If you encounter issues:
1. Check browser console for errors
2. Check server logs for Discord API errors
3. Verify Discord bot has correct permissions
4. Verify role names match exactly (case-sensitive)
5. Verify environment variables are set correctly
