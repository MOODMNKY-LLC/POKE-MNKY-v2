# Admin Role Management with Discord Sync - Complete Implementation

> **Status**: ✅ Complete  
> **Date**: 2026-01-16

---

## ✅ What's Been Implemented

### **1. Admin User Management Page** ✅

**Location**: `/app/admin/users/page.tsx`

**Features**:
- ✅ Role dropdown selector for each user
- ✅ Real-time role updates in database
- ✅ **Automatic Discord sync** when role changes
- ✅ Visual indicator (checkmark) showing Discord connection status
- ✅ Toast notifications for sync success/failure
- ✅ Activity logging for all role changes
- ✅ Search and filter by role
- ✅ User statistics cards

**Role Options**:
- Admin
- Commissioner
- Coach
- Viewer

---

### **2. Discord Sync Function** ✅

**Location**: `/lib/discord-role-sync.ts`

**Function**: `syncAppRoleToDiscord()`

**Features**:
- ✅ Maps app roles to Discord roles using `APP_TO_DISCORD_ROLE_MAP`
- ✅ Removes old mapped roles before adding new ones
- ✅ Reuses existing Discord bot client when available (performance optimization)
- ✅ Creates temporary client if bot not initialized
- ✅ Activity logging for Discord role changes
- ✅ Comprehensive error handling

**Role Mappings**:
```typescript
APP_TO_DISCORD_ROLE_MAP = {
  admin: ["Commissioner", "League Admin"],
  commissioner: ["Commissioner"],
  coach: ["Coach"],           // ← Assigns "Coach" role in Discord
  viewer: ["Spectator"],
}
```

---

### **3. API Endpoint** ✅

**Location**: `/app/api/discord/sync-user-role/route.ts`

**Endpoint**: `POST /api/discord/sync-user-role`

**Features**:
- ✅ Admin-only access protection
- ✅ Validates user has Discord account linked
- ✅ Calls `syncAppRoleToDiscord()` function
- ✅ Returns success/error status
- ✅ Uses Node.js runtime for Discord.js compatibility

**Request**:
```json
{
  "userId": "user-uuid",
  "appRole": "coach"
}
```

**Response**:
```json
{
  "success": true,
  "message": "Updated Discord roles: Coach"
}
```

---

## 🎯 How It Works

### **Complete User Flow:**

1. **Admin navigates to `/admin/users`**
   - Sees list of all users with current roles
   - Users with Discord connected show green checkmark icon

2. **Admin selects new role from dropdown**
   - Example: Changes user from "viewer" to "coach"
   - Dropdown shows: Admin, Commissioner, Coach, Viewer

3. **App updates database immediately**
   - `profiles.role` updated to "coach"
   - Activity logged in `user_activity_log` table
   - UI updates instantly

4. **Automatic Discord sync (non-blocking)**
   - Checks if user has `discord_id` linked
   - If yes → Calls `/api/discord/sync-user-role` endpoint
   - Bot assigns "Coach" role in Discord server
   - Removes any previous mapped roles (e.g., "Spectator")
   - If no Discord ID → Shows toast "user not connected to Discord"

5. **User feedback**
   - ✅ Success: Toast shows "Role updated and synced to Discord"
   - ⚠️ Warning: Toast shows "Role updated in app, but Discord sync failed: [error]"
   - ✅ No Discord: Toast shows "Role updated (user not connected to Discord)"

---

## 🔧 Technical Implementation

### **Discord Bot Client Reuse:**

The sync function intelligently reuses the existing Discord bot client:

```typescript
// Try to reuse existing bot client
const { getDiscordBotClient } = await import("@/lib/discord-bot-service")
const existingClient = getDiscordBotClient()

if (existingClient?.isReady()) {
  client = existingClient  // Reuse existing
  shouldDestroy = false    // Don't destroy shared client
} else {
  client = await createDiscordClient()  // Create temporary
  shouldDestroy = true     // Clean up after use
}
```

**Benefits**:
- ✅ Prevents multiple bot instances
- ✅ Better performance (reuses connection)
- ✅ Proper cleanup (only destroys temporary clients)

---

### **Role Assignment Logic:**

```typescript
// 1. Get Discord role names for app role
const discordRoleNames = APP_TO_DISCORD_ROLE_MAP[appRole] || []
// Example: "coach" → ["Coach"]

// 2. Find Discord role IDs
const discordRoles = discordRoleNames
  .map((name) => guild.roles.cache.find((r) => r.name === name))
  .filter((role) => role !== undefined)

// 3. Remove all mapped roles first (clean slate)
const allMappedRoleIds = Object.values(APP_TO_DISCORD_ROLE_MAP)
  .flat()
  .map((name) => guild.roles.cache.find((r) => r.name === name)?.id)

const rolesToRemove = member.roles.cache.filter((role) =>
  allMappedRoleIds.includes(role.id)
)

if (rolesToRemove.size > 0) {
  await member.roles.remove(Array.from(rolesToRemove.keys()), "App role sync")
}

// 4. Add new roles
if (discordRoles.length > 0) {
  await member.roles.add(
    discordRoles.map((r) => r!.id),
    `App role changed to ${appRole}`
  )
}
```

---

## 📋 Configuration

### **Role Mapping Configuration**

Edit `lib/discord-role-sync.ts` to change Discord role names:

```typescript
export const APP_TO_DISCORD_ROLE_MAP: Record<UserRole, string[]> = {
  admin: ["Commissioner", "League Admin"],  // App admin → these Discord roles
  commissioner: ["Commissioner"],
  coach: ["Coach"],                          // App coach → "Coach" role
  viewer: ["Spectator"],
}
```

**To change role names:**
1. Edit `APP_TO_DISCORD_ROLE_MAP` in `lib/discord-role-sync.ts`
2. Ensure Discord server has roles with matching names
3. Bot role must be higher than roles it manages

---

## ⚠️ Requirements

### **Discord Bot Permissions:**

The bot needs these permissions in Discord:
- ✅ **Manage Roles** - To assign/remove roles
- ✅ **View Server** - To access guild and members
- ✅ Bot role must be **higher** than roles it manages

### **Environment Variables:**

- ✅ `DISCORD_BOT_TOKEN` - Bot token
- ✅ `DISCORD_GUILD_ID` - Server/guild ID
- ✅ `DISCORD_CLIENT_ID` - Application client ID (for command registration)

### **Prerequisites:**

1. **Bot must be initialized**:
   - Go to `/admin/discord/bot`
   - Click "Initialize Bot"
   - Verify bot is ready

2. **User must have Discord account linked**:
   - User must have `discord_id` in their profile
   - Linked via Discord OAuth login

3. **Discord roles must exist**:
   - Server must have roles matching `APP_TO_DISCORD_ROLE_MAP`
   - Role names are **case-sensitive**

---

## 🧪 Testing Guide

### **Test Scenario 1: Successful Role Change**

1. **Prerequisites**:
   - Bot initialized (`/admin/discord/bot`)
   - User has Discord account linked
   - Discord server has "Coach" role

2. **Steps**:
   - Go to `/admin/users`
   - Find user with Discord connected (green checkmark visible)
   - Change role from "viewer" to "coach"
   - Verify:
     - ✅ Toast shows "Role updated and synced to Discord"
     - ✅ Role updates in app table
     - ✅ User gets "Coach" role in Discord server
     - ✅ Previous role ("Spectator") removed

### **Test Scenario 2: User Without Discord**

1. **Steps**:
   - Go to `/admin/users`
   - Find user without Discord connected (no checkmark)
   - Change role
   - Verify:
     - ✅ Toast shows "Role updated (user not connected to Discord)"
     - ✅ Role updates in app
     - ✅ No Discord sync attempted

### **Test Scenario 3: Discord Sync Failure**

1. **Steps**:
   - Disable bot or remove Discord role
   - Change user role
   - Verify:
     - ✅ Toast shows warning with error message
     - ✅ Role still updates in app
     - ✅ User can continue working

---

## 📊 Visual Indicators

### **In Admin Users Table:**

- **Green Checkmark** (✓): User has Discord connected, role changes will sync
- **No Checkmark**: User not connected to Discord, role changes won't sync
- **Role Badge**: Shows current role with Pokeball icon

### **Toast Notifications:**

- ✅ **Success**: "Role updated and synced to Discord"
- ⚠️ **Warning**: "Role updated in app, but Discord sync failed: [error]"
- ℹ️ **Info**: "Role updated (user not connected to Discord)"

---

## 🔄 Bidirectional Sync

### **Current Implementation:**

- ✅ **App → Discord**: Admin changes role in app → Syncs to Discord ✅ **IMPLEMENTED**
- ✅ **Discord → App**: Admin changes role in Discord → Syncs to app ✅ **ALREADY EXISTS**

**Both directions work!**

---

## 📚 Related Files

- **Admin UI**: `app/admin/users/page.tsx`
- **Sync Function**: `lib/discord-role-sync.ts`
- **API Endpoint**: `app/api/discord/sync-user-role/route.ts`
- **Bot Service**: `lib/discord-bot-service.ts`
- **Role Mappings**: `lib/discord-role-sync.ts` (APP_TO_DISCORD_ROLE_MAP)

---

## 🎯 Summary

**What You Can Do Now:**

1. ✅ Go to `/admin/users`
2. ✅ Select any user
3. ✅ Change their role from dropdown
4. ✅ Role automatically syncs to Discord (if user has Discord connected)
5. ✅ See visual feedback via toast notifications
6. ✅ Check Discord server to verify role assignment

**All endpoints are verified and the system is ready to use!** 🎉

---

## 🚀 Next Steps (Optional Enhancements)

1. **Bulk Role Assignment**: Assign roles to multiple users at once
2. **Role History**: View history of role changes
3. **Discord Role Preview**: Show current Discord roles in admin table
4. **Sync Status Indicator**: Show last sync time/status
5. **Manual Sync Button**: Force sync for specific users

---

**Admin role management with Discord sync is fully implemented!** 🎉
