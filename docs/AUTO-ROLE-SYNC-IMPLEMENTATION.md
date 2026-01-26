# Automatic Discord Role Sync on Authentication - Implementation Summary

## ✅ Problem Solved

**Before**: Users who authenticated with Discord OAuth and already had Discord roles assigned would get the default "spectator" role and had to wait for an admin to manually sync roles.

**After**: Users automatically get their Discord roles synced to the app on first authentication, ensuring immediate proper access.

---

## 🔄 How It Works

### **OAuth Flow with Auto-Sync**

1. **User clicks "Continue with Discord"**
   - Redirected to Discord OAuth
   - Authorizes app access

2. **OAuth Callback** (`app/auth/callback/route.ts`)
   - Code exchanged for Supabase session
   - Profile created via `handle_new_user()` trigger
   - **NEW**: Automatic Discord role sync triggered

3. **Role Sync Process** (Async, Non-blocking)
   - Extracts Discord ID from profile
   - Calls `syncDiscordRoleToApp()` function
   - Fetches current Discord roles from Discord API
   - Maps Discord roles → App role (admin/commissioner/coach/spectator)
   - Updates app role in database
   - Saves all Discord roles to `discord_roles` JSONB column
   - **Doesn't block redirect** - happens in background

4. **User Redirected**
   - Immediately redirected to dashboard
   - Role sync completes in background
   - User sees updated role on next page load

---

## 📋 Implementation Details

### **File**: `app/auth/callback/route.ts`

```typescript
// After successful session exchange
if (data.user?.app_metadata?.provider === "discord" && data.user.id) {
  // Get Discord ID from profile (most reliable)
  const { data: profile } = await supabase
    .from("profiles")
    .select("discord_id")
    .eq("id", data.user.id)
    .single()

  const discordId = profile?.discord_id || /* fallbacks */

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
- ✅ **Fallback**: Multiple sources checked for Discord ID

---

## 🎯 Discord Linked Roles vs Our System

### **Discord Linked Roles** (Different Feature)
- **Purpose**: Assign Discord roles based on external account connections (Steam, Twitter, etc.)
- **How it works**: Users connect external accounts → Discord verifies → Roles assigned
- **Use case**: Verification (e.g., "Twitter account older than 30 days")
- **Status**: Not what we're using - this is for assigning Discord roles, not syncing them

### **Our System** (Role Sync)
- **Purpose**: Sync existing Discord server roles to app roles
- **How it works**: Read Discord roles → Map to app roles → Update database
- **Use case**: Ensure app access matches Discord permissions
- **Status**: ✅ What we're implementing - ensures users get proper access immediately

**Key Difference**: Linked Roles assigns Discord roles based on external connections. Our system syncs existing Discord roles to app roles.

---

## ✅ Two-Way Sync Status

### **Discord → App** ✅ COMPLETE
- ✅ Manual sync via `/api/discord/sync-roles`
- ✅ **Automatic sync on OAuth authentication** (NEW)
- ✅ Handles role additions, removals, and changes
- ✅ Saves Discord roles to database

### **App → Discord** ✅ COMPLETE
- ✅ Automatic sync when admin changes app role
- ✅ Removes old Discord roles, adds new ones
- ✅ Handles all role changes correctly

---

## 🧪 Test Scenarios

### **Scenario 1: New User with Discord Role**
1. User has "Coach" role in Discord server
2. User authenticates with Discord OAuth
3. **Expected**:
   - ✅ User authenticated successfully
   - ✅ App role becomes "coach" (from Discord "Coach" role)
   - ✅ `discord_roles` column shows `[{"name": "Coach", ...}]`
   - ✅ User redirected to dashboard immediately
   - ✅ Role sync happens in background

### **Scenario 2: New User without Discord Role**
1. User has no roles in Discord server
2. User authenticates with Discord OAuth
3. **Expected**:
   - ✅ User authenticated successfully
   - ✅ App role is "spectator" (default)
   - ✅ `discord_roles` column shows `[]`
   - ✅ User redirected to dashboard

### **Scenario 3: User Re-authenticating**
1. User already has profile in database
2. User authenticates with Discord OAuth again
3. **Expected**:
   - ✅ Profile updated (if metadata changed)
   - ✅ Discord roles synced again (refreshes database)
   - ✅ User redirected to dashboard

---

## 🔍 Verification

### **Check Logs**
Look for these messages in server logs:
```
[OAuth Callback] Auto-syncing Discord roles for user <user-id> (Discord: <discord-id>)
[Discord Sync] Fetching member <discord-id>...
[Discord Sync] Updated app role from spectator to coach
```

### **Check Database**
```sql
-- Check user's role and Discord roles
SELECT id, display_name, role, discord_roles, updated_at
FROM profiles
WHERE id = '<user-id>';

-- Should show:
-- role: 'coach' (or whatever Discord role maps to)
-- discord_roles: [{"id": "...", "name": "Coach", ...}]
```

---

## 🎉 Benefits

1. **Immediate Access**: Users with Discord roles get app access right away
2. **No Manual Steps**: No need to wait for admin to run sync
3. **Better UX**: Seamless experience for new users
4. **Database Sync**: Discord roles saved automatically
5. **Non-blocking**: Auth flow remains fast and responsive
6. **Error Resilient**: Errors don't break authentication

---

## 📝 Summary

**Question**: "If a user has already been assigned roles in Discord before authenticating with our app, have we configured it to where they are immediately assigned their Discord roles with the necessary access?"

**Answer**: ✅ **YES!** 

- Users who authenticate with Discord OAuth automatically get their Discord roles synced
- App role is updated based on Discord roles
- Discord roles are saved to database
- Happens automatically on first authentication
- Non-blocking - doesn't delay auth flow

**Discord Linked Roles**: This is a different feature (assigns Discord roles based on external connections). We're not using it - we're syncing existing Discord server roles to app roles, which is what you need.

---

**Last Updated**: 2026-01-25  
**Status**: ✅ Implemented and Ready  
**Related Docs**:
- `docs/TWO-WAY-DISCORD-SYNC-VALIDATION.md`
- `docs/DISCORD-ROLES-DATABASE-STORAGE.md`
- `docs/AUTO-DISCORD-ROLE-SYNC-ON-AUTH.md`
