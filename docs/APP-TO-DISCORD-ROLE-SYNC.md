# App-to-Discord Role Sync Implementation

> **Status**: ✅ Complete  
> **Date**: 2026-01-16

---

## ✅ What's Implemented

### **1. Admin User Management Page** ✅

**Location**: `/app/admin/users/page.tsx`

- ✅ Role dropdown selector for each user
- ✅ Real-time role updates in database
- ✅ Automatic Discord sync when role changes
- ✅ Visual indicator showing Discord sync status
- ✅ Toast notifications for sync success/failure

**Features**:
- Dropdown with roles: Admin, Commissioner, Coach, Viewer
- Shows checkmark icon if user has Discord connected
- Non-blocking Discord sync (app role updates even if Discord fails)
- Activity logging for all role changes

---

### **2. Discord Sync Function** ✅

**Location**: `/lib/discord-role-sync.ts`

- ✅ `syncAppRoleToDiscord()` function implemented
- ✅ Reuses existing Discord bot client when available
- ✅ Maps app roles to Discord roles using `APP_TO_DISCORD_ROLE_MAP`
- ✅ Removes old mapped roles before adding new ones
- ✅ Activity logging for Discord role changes

**Role Mappings**:
```typescript
APP_TO_DISCORD_ROLE_MAP = {
  admin: ["Commissioner", "League Admin"],
  commissioner: ["Commissioner"],
  coach: ["Coach"],
  viewer: ["Spectator"],
}
```

---

### **3. API Endpoint** ✅

**Location**: `/app/api/discord/sync-user-role/route.ts`

- ✅ POST endpoint for syncing single user role
- ✅ Admin-only access protection
- ✅ Validates user has Discord account linked
- ✅ Calls `syncAppRoleToDiscord()` function
- ✅ Returns success/error status

**Usage**:
```typescript
POST /api/discord/sync-user-role
Body: { userId: string, appRole: UserRole }
```

---

## 🎯 How It Works

### **User Flow:**

1. **Admin navigates to `/admin/users`**
   - Sees list of all users with current roles

2. **Admin selects new role from dropdown**
   - Example: Changes user from "viewer" to "coach"

3. **App updates database**
   - `profiles.role` updated to "coach"
   - Activity logged in `user_activity_log`

4. **Automatic Discord sync**
   - Checks if user has `discord_id` linked
   - Calls `/api/discord/sync-user-role` endpoint
   - Bot assigns "Coach" role in Discord
   - Removes any previous mapped roles (e.g., "Spectator")

5. **User feedback**
   - Toast notification shows success/failure
   - Visual checkmark indicates Discord connection

---

## 🔧 Technical Details

### **Discord Bot Permissions Required:**

The bot needs these permissions in Discord:
- ✅ **Manage Roles** - To assign/remove roles
- ✅ **View Server** - To access guild and members
- ✅ Bot role must be **higher** than roles it manages

### **Bot Client Reuse:**

The sync function intelligently reuses the existing Discord bot client:
- If bot is already initialized → reuse it
- If not → create temporary client for sync
- Prevents multiple bot instances

### **Error Handling:**

- Non-blocking: App role updates even if Discord sync fails
- User-friendly error messages via toast notifications
- Activity logging for debugging
- Graceful fallback if Discord is unavailable

---

## 📋 Role Mapping Configuration

### **Current Mappings** (`lib/discord-role-sync.ts`):

```typescript
// App → Discord
export const APP_TO_DISCORD_ROLE_MAP: Record<UserRole, string[]> = {
  admin: ["Commissioner", "League Admin"],
  commissioner: ["Commissioner"],
  coach: ["Coach"],           // ← Maps to "Coach" role in Discord
  viewer: ["Spectator"],
}
```

### **To Change Role Names:**

Edit `lib/discord-role-sync.ts`:

```typescript
export const APP_TO_DISCORD_ROLE_MAP: Record<UserRole, string[]> = {
  coach: ["Coaches"],  // Change from "Coach" to "Coaches"
  // ...
}
```

**Important**: Role names are **case-sensitive** and must match exactly!

---

## 🚀 Usage Example

### **Admin Changes User Role:**

1. Go to `/admin/users`
2. Find user in table
3. Click role dropdown (e.g., "Viewer")
4. Select new role (e.g., "Coach")
5. Role updates in app immediately
6. Discord sync happens automatically
7. Toast notification confirms success

### **What Happens Behind the Scenes:**

```
Admin selects "Coach" → 
  Database updated → 
    Check Discord ID → 
      Call sync API → 
        Bot assigns "Coach" role in Discord → 
          Remove "Spectator" role → 
            Success toast shown
```

---

## ⚠️ Important Notes

1. **Discord Connection Required**: User must have `discord_id` in their profile for sync to work
2. **Bot Must Be Initialized**: Discord bot must be running (via `/admin/discord/bot`)
3. **Role Hierarchy**: Bot's role must be higher than roles it manages
4. **Case Sensitivity**: Discord role names must match exactly (case-sensitive)

---

## 🧪 Testing

### **Test Steps:**

1. **Ensure bot is initialized**:
   - Go to `/admin/discord/bot`
   - Click "Initialize Bot"
   - Verify bot is ready

2. **Test role change**:
   - Go to `/admin/users`
   - Find a user with Discord connected
   - Change their role from dropdown
   - Verify:
     - ✅ Role updates in app
     - ✅ Toast notification appears
     - ✅ Role updates in Discord (check Discord server)

3. **Test error handling**:
   - Change role for user without Discord ID
   - Verify toast shows "user not connected to Discord"
   - Verify app role still updates

---

## 📚 Related Files

- **Admin UI**: `app/admin/users/page.tsx`
- **Sync Function**: `lib/discord-role-sync.ts`
- **API Endpoint**: `app/api/discord/sync-user-role/route.ts`
- **Bot Service**: `lib/discord-bot-service.ts`
- **Role Mappings**: `lib/discord-role-sync.ts` (APP_TO_DISCORD_ROLE_MAP)

---

**App-to-Discord role sync is fully implemented and ready to use!** 🎉
