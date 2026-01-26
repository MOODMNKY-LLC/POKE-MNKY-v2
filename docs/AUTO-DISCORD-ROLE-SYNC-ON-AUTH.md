# Automatic Discord Role Sync on Authentication

## Overview

Users who authenticate with Discord OAuth and already have Discord roles assigned will now automatically receive those roles synced to their app account on first login. This ensures immediate access without waiting for manual admin sync.

## How It Works

### **OAuth Flow with Auto-Sync**

1. **User authenticates with Discord OAuth**
   - Clicks "Continue with Discord" on login page
   - Redirected to Discord for authorization
   - Returns to `/auth/callback` with authorization code

2. **Session Exchange**
   - Code exchanged for Supabase session
   - User profile created via `handle_new_user()` trigger
   - Default role assigned: 'admin' (first user) or 'spectator' (others)

3. **Automatic Role Sync** (NEW)
   - If user authenticated via Discord (`provider === "discord"`)
   - Extract Discord ID from user metadata
   - Call `syncDiscordRoleToApp()` asynchronously
   - Updates app role based on Discord roles
   - Saves Discord roles to database
   - **Non-blocking**: Happens in background, doesn't delay redirect

4. **Redirect to Dashboard**
   - User redirected immediately
   - Role sync completes in background
   - User sees updated role on next page load/refresh

## Implementation Details

### **File**: `app/auth/callback/route.ts`

```typescript
// After successful session exchange
if (data.user?.app_metadata?.provider === "discord" && data.user.id) {
  const discordId = data.user.user_metadata?.provider_id || 
                   data.user.user_metadata?.sub ||
                   data.user.app_metadata?.provider_id

  if (discordId) {
    // Sync roles asynchronously (don't block redirect)
    syncDiscordRoleToApp(discordId, data.user.id).catch((error) => {
      console.error(`Failed to auto-sync Discord roles:`, error.message)
    })
  }
}
```

### **Key Features**

- ✅ **Non-blocking**: Async operation doesn't delay auth redirect
- ✅ **Error handling**: Errors logged but don't break auth flow
- ✅ **Automatic**: No user action required
- ✅ **Immediate**: Roles synced on first login
- ✅ **Database persistence**: Discord roles saved to `discord_roles` column

## Discord Linked Roles vs Our System

### **Discord Linked Roles** (Different Feature)
- Assigns Discord roles based on external account connections (Steam, Twitter, etc.)
- Users must opt-in to receive Linked Roles
- Used for verification (e.g., "Twitter account older than 30 days")
- **Not what we're using** - we sync existing Discord server roles

### **Our System** (Role Sync)
- Syncs existing Discord server roles to app roles
- Automatic on authentication
- Maps Discord roles → App roles based on priority
- **What we're implementing** - ensures users get proper access immediately

## Benefits

1. **Immediate Access**: Users with Discord roles get app access right away
2. **No Manual Steps**: No need to wait for admin to run sync
3. **Better UX**: Seamless experience for new users
4. **Database Sync**: Discord roles saved to database automatically
5. **Non-blocking**: Auth flow remains fast and responsive

## Edge Cases Handled

- **No Discord ID**: Logs warning, continues auth flow
- **Sync fails**: Logs error, user still authenticated (can sync manually later)
- **User not in Discord server**: Sync gracefully handles missing member
- **Multiple roles**: Highest priority role assigned, all roles saved to database

## Testing

### **Test Scenario 1: New User with Discord Role**
1. User has "Coach" role in Discord server
2. User authenticates with Discord OAuth
3. **Expected**: 
   - User authenticated successfully
   - App role becomes "coach" (from Discord "Coach" role)
   - `discord_roles` column shows `[{"name": "Coach", ...}]`
   - User redirected to dashboard

### **Test Scenario 2: New User without Discord Role**
1. User has no roles in Discord server
2. User authenticates with Discord OAuth
3. **Expected**:
   - User authenticated successfully
   - App role is "spectator" (default)
   - `discord_roles` column shows `[]`
   - User redirected to dashboard

### **Test Scenario 3: Existing User Re-authenticating**
1. User already has profile in database
2. User authenticates with Discord OAuth again
3. **Expected**:
   - Profile updated (if metadata changed)
   - Discord roles synced again (refreshes database)
   - User redirected to dashboard

## Verification

After authentication, check:
1. **Database**: `SELECT role, discord_roles FROM profiles WHERE id = '<user-id>'`
2. **Logs**: Look for `[OAuth Callback] Auto-syncing Discord roles` message
3. **UI**: User should see correct role badge/permissions

## Future Enhancements

- **Real-time sync**: Listen for Discord role changes via bot events
- **Webhook integration**: Sync roles when changed in Discord
- **Batch sync**: Sync all users periodically via cron job

---

**Last Updated**: 2026-01-25  
**Status**: ✅ Implemented  
**Related**: `docs/TWO-WAY-DISCORD-SYNC-VALIDATION.md`
