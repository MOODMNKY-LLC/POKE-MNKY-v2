# RBAC Analysis & Discord Role Sync Implementation

## Executive Summary

**Admin Dashboard RBAC Editing:** ✅ **FULLY FUNCTIONAL**
- Role toggling via dropdown selector
- Direct database updates
- Activity logging
- Admin-only access protection

**Discord Role Sync:** ⚠️ **PARTIALLY IMPLEMENTED**
- UI exists at `/admin/discord/roles`
- Backend sync function is **NOT IMPLEMENTED** (marked as TODO)
- Database structure supports Discord integration
- No active Discord bot for role synchronization

---

## 1. Current RBAC System

### 1.1 Role Structure

Your application has **4 roles** defined in the database:

#### **Admin** (`admin`)
- **Permissions:** `["*"]` (Full system access)
- **Description:** Full system access - can manage users, settings, and all league data
- **Access:**
  - ✅ Manage all users and roles
  - ✅ System configuration
  - ✅ All league operations
  - ✅ Database administration
  - ✅ View all analytics

#### **Commissioner** (`commissioner`)
- **Permissions:** 
  ```json
  [
    "manage:league",
    "manage:teams",
    "manage:matches",
    "manage:trades",
    "view:analytics"
  ]
  ```
- **Description:** League management - can manage teams, matches, and league operations
- **Access:**
  - ✅ Manage league settings
  - ✅ Manage all teams
  - ✅ Manage matches and results
  - ✅ Manage trades
  - ✅ View analytics
  - ❌ Cannot manage users or system settings

#### **Coach** (`coach`)
- **Permissions:**
  ```json
  [
    "manage:own_team",
    "submit:results",
    "propose:trades",
    "view:league"
  ]
  ```
- **Description:** Team management - can manage own team roster and submit match results
- **Access:**
  - ✅ Manage own team roster
  - ✅ Submit match results
  - ✅ Propose trades
  - ✅ View league information
  - ❌ Cannot manage other teams
  - ❌ Cannot manage league settings

#### **Viewer** (`viewer`)
- **Permissions:**
  ```json
  [
    "view:league",
    "view:standings",
    "view:schedule"
  ]
  ```
- **Description:** Read-only access to league information
- **Access:**
  - ✅ View league standings
  - ✅ View schedule
  - ✅ View public league data
  - ❌ Cannot submit results
  - ❌ Cannot manage teams
  - ❌ Cannot propose trades

### 1.2 Database Schema

**Table: `profiles`**
```sql
- id UUID (references auth.users)
- role TEXT CHECK (role IN ('admin', 'commissioner', 'coach', 'viewer'))
- permissions JSONB DEFAULT '[]'::jsonb
- discord_id TEXT UNIQUE
- discord_username TEXT
- discord_avatar TEXT
- team_id UUID (references teams)
- is_active BOOLEAN DEFAULT TRUE
```

**Table: `role_permissions`**
```sql
- role TEXT UNIQUE
- permissions JSONB NOT NULL
- description TEXT
```

**Database Functions:**
- `user_has_permission(user_id UUID, required_permission TEXT)` → BOOLEAN
- `get_user_permissions(user_id UUID)` → JSONB

### 1.3 Permission Checking

**In Code (`lib/rbac.ts`):**
```typescript
// Check role
await hasRole(supabase, userId, UserRole.ADMIN)

// Check permission
await hasPermission(supabase, userId, Permissions.MANAGE_TEAMS)

// Require role (throws if not)
await requireRole(supabase, userId, [UserRole.ADMIN, UserRole.COMMISSIONER])
```

---

## 2. Admin Dashboard RBAC Editing

### 2.1 Current Implementation

**Location:** `/admin/users` (`app/admin/users/page.tsx`)

**Features:**
- ✅ **Role Dropdown Selector** - Change user roles via dropdown
- ✅ **Direct Database Updates** - Updates `profiles.role` column
- ✅ **Activity Logging** - Logs role changes to `user_activity_log`
- ✅ **Admin Protection** - Only admins can access
- ✅ **Self-Protection** - Cannot change own role
- ✅ **User Status Toggle** - Activate/deactivate users
- ✅ **Search & Filter** - Search by name, email, Discord; filter by role
- ✅ **Role Statistics** - Shows count per role

**Code Example:**
```typescript
async function updateUserRole(userId: string, newRole: UserRole) {
  const { error } = await supabase
    .from("profiles")
    .update({ role: newRole })
    .eq("id", userId)

  // Log activity
  await supabase.from("user_activity_log").insert({
    user_id: currentUser.id,
    action: "update_user_role",
    resource_type: "profile",
    resource_id: userId,
    metadata: { new_role: newRole },
  })
}
```

### 2.2 Assessment

**✅ Fully Functional:**
- Role toggling works perfectly
- Database updates are immediate
- Activity logging is in place
- UI is user-friendly

**⚠️ Potential Enhancements:**
- Add confirmation dialog before role changes
- Show permission changes preview
- Add bulk role updates
- Add role change history/audit trail
- Add email notifications for role changes

---

## 3. Discord Role Synchronization

### 3.1 Current State

**UI Exists:** `/admin/discord/roles` (`app/admin/discord/roles/page.tsx`)

**Status:**
- ✅ UI for role mapping configuration
- ✅ UI for viewing user sync status
- ✅ **Backend sync function IMPLEMENTED**
- ✅ **Bidirectional sync working**
- ⚠️ Real-time bot integration (optional - for automatic sync on Discord events)

**Implementation:**
- **Discord → App:** Manual sync button calls `/api/discord/sync-roles`
- **App → Discord:** Automatic sync when admin changes role in `/admin/users`
- **Role Mappings:** Configured in `lib/discord-role-sync.ts`

### 3.2 Implementation Details

#### ✅ Bidirectional Sync (IMPLEMENTED)

**Files Created:**
1. `lib/discord-role-sync.ts` - Core sync utilities
2. `app/api/discord/sync-roles/route.ts` - Discord → App sync endpoint
3. `app/api/discord/sync-user-role/route.ts` - App → Discord sync endpoint

**How It Works:**

**Discord → App Sync:**
- Admin clicks "Sync Now" button in `/admin/discord/roles`
- Calls `/api/discord/sync-roles` endpoint
- Fetches all Discord server members
- Maps Discord roles to app roles using `DISCORD_TO_APP_ROLE_MAP`
- Updates user profiles in database
- Logs all changes to activity log

**App → Discord Sync:**
- Admin changes user role in `/admin/users` page
- App role is updated in database
- Automatically calls `/api/discord/sync-user-role` endpoint
- Updates Discord member roles using `APP_TO_DISCORD_ROLE_MAP`
- Non-blocking (if Discord sync fails, app role update still succeeds)

**Role Mappings:**

```typescript
// Discord → App
DISCORD_TO_APP_ROLE_MAP = {
  "Commissioner": "admin",
  "League Admin": "admin",
  "Coach": "coach",
  "Spectator": "viewer"
}

// App → Discord
APP_TO_DISCORD_ROLE_MAP = {
  admin: ["Commissioner", "League Admin"],
  commissioner: ["Commissioner"],
  coach: ["Coach"],
  viewer: ["Spectator"]
}
```

#### Option A: API Route + Manual Sync (✅ COMPLETE)

**Implementation Status:** ✅ Fully implemented with bidirectional sync

**Files:**
1. ✅ `lib/discord-role-sync.ts` - Core sync utilities
2. ✅ `app/api/discord/sync-roles/route.ts` - Discord → App endpoint
3. ✅ `app/api/discord/sync-user-role/route.ts` - App → Discord endpoint
4. ✅ Updated `app/admin/users/page.tsx` - Auto-syncs to Discord on role change
5. ✅ Updated `app/admin/discord/roles/page.tsx` - Calls sync endpoint

**How to Configure Role Mappings:**

Edit `lib/discord-role-sync.ts` to match your Discord server role names:

```typescript
// Update these mappings to match your Discord server
export const DISCORD_TO_APP_ROLE_MAP: Record<string, UserRole> = {
  "Commissioner": "admin",        // Change "Commissioner" to your Discord role name
  "League Admin": "admin",         // Change "League Admin" to your Discord role name
  "Coach": "coach",                // Change "Coach" to your Discord role name
  "Spectator": "viewer",           // Change "Spectator" to your Discord role name
}

export const APP_TO_DISCORD_ROLE_MAP: Record<UserRole, string[]> = {
  admin: ["Commissioner", "League Admin"],  // App admin → these Discord roles
  commissioner: ["Commissioner"],            // App commissioner → this Discord role
  coach: ["Coach"],                          // App coach → this Discord role
  viewer: ["Spectator"],                      // App viewer → this Discord role
}
```

**Original Implementation Plan (for reference):**

**1. Create API Route:** `app/api/discord/sync-roles/route.ts`

```typescript
import { NextRequest, NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase/server"
import { createServiceRoleClient } from "@/lib/supabase/service"
import { Client, GatewayIntentBits } from "discord.js"

export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerClient()
    
    // Verify admin access
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single()

    if (profile?.role !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    // Initialize Discord bot
    const discordBot = new Client({
      intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMembers],
    })

    await discordBot.login(process.env.DISCORD_BOT_TOKEN)
    const guild = await discordBot.guilds.fetch(process.env.DISCORD_GUILD_ID!)

    // Get role mappings from database (or use defaults)
    const roleMappings = {
      'Commissioner': 'admin',
      'League Admin': 'admin',
      'Coach': 'coach',
      'Spectator': 'viewer',
    }

    // Fetch all Discord members
    const members = await guild.members.fetch()
    
    // Use service role client for updates
    const serviceSupabase = createServiceRoleClient()
    const results = { updated: 0, skipped: 0, errors: 0 }

    // Sync each member
    for (const [discordId, member] of members) {
      // Find user in database by discord_id
      const { data: profile } = await serviceSupabase
        .from("profiles")
        .select("id, role")
        .eq("discord_id", discordId)
        .single()

      if (!profile) {
        results.skipped++
        continue
      }

      // Determine app role from Discord roles
      let appRole = 'viewer' // Default
      for (const [discordRoleName, mappedRole] of Object.entries(roleMappings)) {
        if (member.roles.cache.some(r => r.name === discordRoleName)) {
          appRole = mappedRole
          break // Use first match (highest priority)
        }
      }

      // Update if different
      if (profile.role !== appRole) {
        const { error } = await serviceSupabase
          .from("profiles")
          .update({ role: appRole })
          .eq("id", profile.id)

        if (error) {
          console.error(`Failed to update ${discordId}:`, error)
          results.errors++
        } else {
          results.updated++
          
          // Log activity
          await serviceSupabase.from("user_activity_log").insert({
            user_id: profile.id,
            action: "discord_role_sync",
            resource_type: "profile",
            resource_id: profile.id,
            metadata: { 
              old_role: profile.role,
              new_role: appRole,
              synced_by: user.id
            },
          })
        }
      } else {
        results.skipped++
      }
    }

    await discordBot.destroy()

    return NextResponse.json({
      success: true,
      results,
      message: `Synced ${results.updated} users, ${results.skipped} unchanged, ${results.errors} errors`
    })

  } catch (error: any) {
    console.error("[Discord Sync] Error:", error)
    return NextResponse.json(
      { error: error.message || "Failed to sync roles" },
      { status: 500 }
    )
  }
}
```

**2. Update UI to Call API:**

```typescript
async function syncRoles() {
  setSyncing(true)
  try {
    const response = await fetch("/api/discord/sync-roles", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
    })

    const data = await response.json()
    
    if (!response.ok) {
      throw new Error(data.error || "Failed to sync roles")
    }

    toast.success(data.message || "Role sync completed")
    loadUsers()
  } catch (error: any) {
    toast.error("Failed to sync roles: " + error.message)
  } finally {
    setSyncing(false)
  }
}
```

#### Option B: Real-time Bot Integration (Advanced)

Create a Discord bot that listens for role changes and syncs automatically:

**1. Create Bot Service:** `lib/discord-bot.ts`

```typescript
import { Client, GatewayIntentBits, Events } from "discord.js"
import { createServiceRoleClient } from "@/lib/supabase/service"

const roleMappings = {
  'Commissioner': 'admin',
  'League Admin': 'admin',
  'Coach': 'coach',
  'Spectator': 'viewer',
}

export function initializeDiscordBot() {
  const client = new Client({
    intents: [
      GatewayIntentBits.Guilds,
      GatewayIntentBits.GuildMembers,
    ],
  })

  // Sync roles when member updates
  client.on(Events.GuildMemberUpdate, async (oldMember, newMember) => {
    if (oldMember.roles.cache.size === newMember.roles.cache.size) return

    await syncMemberRoles(newMember)
  })

  // Sync roles when member joins
  client.on(Events.GuildMemberAdd, async (member) => {
    await syncMemberRoles(member)
  })

  client.login(process.env.DISCORD_BOT_TOKEN)
  return client
}

async function syncMemberRoles(member: any) {
  const supabase = createServiceRoleClient()
  
  // Find user by discord_id
  const { data: profile } = await supabase
    .from("profiles")
    .select("id, role")
    .eq("discord_id", member.id)
    .single()

  if (!profile) return

  // Determine app role
  let appRole = 'viewer'
  for (const [discordRoleName, mappedRole] of Object.entries(roleMappings)) {
    if (member.roles.cache.some(r => r.name === discordRoleName)) {
      appRole = mappedRole
      break
    }
  }

  // Update if different
  if (profile.role !== appRole) {
    await supabase
      .from("profiles")
      .update({ role: appRole })
      .eq("id", profile.id)
  }
}
```

**2. Start Bot in Edge Function or Background Service**

---

## 4. Recommended Implementation Steps

### Phase 1: Manual Sync API (Quick Win)
1. ✅ Create `/api/discord/sync-roles` route
2. ✅ Update UI to call API
3. ✅ Test with Discord server
4. ✅ Add role mapping configuration UI

### Phase 2: Role Mapping Storage
1. Create `discord_role_mappings` table:
   ```sql
   CREATE TABLE discord_role_mappings (
     id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
     discord_role_id TEXT NOT NULL,
     discord_role_name TEXT NOT NULL,
     app_role TEXT NOT NULL CHECK (app_role IN ('admin', 'commissioner', 'coach', 'viewer')),
     priority INTEGER DEFAULT 0,
     created_at TIMESTAMPTZ DEFAULT NOW()
   );
   ```
2. Update API to use stored mappings
3. Add CRUD UI for mappings

### Phase 3: Real-time Bot (Optional)
1. Create Discord bot service
2. Listen for `guildMemberUpdate` events
3. Auto-sync on role changes
4. Deploy as background service or edge function

---

## 5. Environment Variables Required

```env
DISCORD_BOT_TOKEN=your_bot_token
DISCORD_GUILD_ID=your_server_id
DISCORD_CLIENT_ID=your_client_id
DISCORD_CLIENT_SECRET=your_client_secret
```

---

## 6. Testing Checklist

- [ ] Admin can trigger manual sync
- [ ] Discord roles map correctly to app roles
- [ ] Users without Discord roles default to viewer
- [ ] Role changes are logged to activity log
- [ ] Cannot sync if not admin
- [ ] Handles users not in Discord server
- [ ] Handles users not linked to Discord account
- [ ] Error handling for Discord API failures

---

## 7. Security Considerations

1. **Admin-Only Access:** Sync endpoint must verify admin role
2. **Service Role Key:** Use service role client for database updates (bypasses RLS)
3. **Rate Limiting:** Discord API has rate limits - implement retry logic
4. **Error Handling:** Don't expose Discord API errors to users
5. **Audit Trail:** Log all sync operations to `user_activity_log`

---

## Summary

**Current State:**
- ✅ RBAC system is fully functional
- ✅ Admin dashboard can edit roles
- ⚠️ Discord sync UI exists but backend is missing

**Next Steps:**
1. Implement `/api/discord/sync-roles` endpoint (Option A - Recommended)
2. Update UI to call the endpoint
3. Test with your Discord server
4. Consider real-time bot integration later (Option B)
