# Discord Role Change Flow - Complete Guide

> **Last Updated**: 2026-01-16  
> **Status**: ✅ Fully Implemented

---

## 🎯 Overview

When a user receives the **"Coach"** role in Discord, the system automatically:
1. Syncs their Discord role to the app
2. Creates a coach entry in the database
3. Assigns them to an available team
4. Updates their profile with team information

---

## 🔄 Complete Flow Diagram

```
┌─────────────────────────────────────────────────────────────┐
│  Step 1: Admin assigns "Coach" role in Discord            │
└───────────────────────┬───────────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────────────────┐
│  Step 2: Discord Bot detects role change                    │
│  (guildMemberUpdate event)                                  │
└───────────────────────┬───────────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────────────────┐
│  Step 3: Bot syncs role to app                              │
│  - Checks Discord roles                                     │
│  - Maps "Coach" → "coach" app role                          │
│  - Updates profiles.role in database                        │
└───────────────────────┬───────────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────────────────┐
│  Step 4: Bot checks if user is already a coach              │
│  - Looks up user by discord_id                              │
│  - Checks if team_id exists                                 │
└───────────────────────┬───────────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────────────────┐
│  Step 5: Create coach entry (if needed)                     │
│  - Creates entry in coaches table                           │
│  - Links to user via user_id                                │
└───────────────────────┬───────────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────────────────┐
│  Step 6: Assign coach to team                               │
│  - Finds available team in current season                   │
│  - Updates teams.coach_id                                   │
│  - Updates profiles.team_id                                 │
└───────────────────────┬───────────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────────────────┐
│  Step 7: User refreshes profile page                        │
│  - Sees coach card with team info                           │
│  - Can upload team avatar                                   │
│  - Can edit team name                                       │
└─────────────────────────────────────────────────────────────┘
```

---

## 📋 Prerequisites

### **1. Discord Role Setup**

**Required Role Name**: The Discord role must be named exactly **"Coach"** (capital C, lowercase oach).

**Why?** The role mapping in `lib/discord-role-sync.ts` looks for this exact name:

```typescript
export const APP_TO_DISCORD_ROLE_MAP: Record<UserRole, string[]> = {
  coach: ["Coach"],  // ← Must match exactly
  // ...
}
```

**To Check Your Discord Role Name:**
1. Go to Discord Server Settings → Roles
2. Find your coach role
3. Verify it's named exactly "Coach" (not "Coaches", "coach", "COACH", etc.)

**To Change the Mapping:**
If your Discord role has a different name, edit `lib/discord-role-sync.ts`:

```typescript
export const APP_TO_DISCORD_ROLE_MAP: Record<UserRole, string[]> = {
  coach: ["Your Role Name Here"],  // ← Change this
  // ...
}
```

### **2. Discord Bot Setup**

**Environment Variables:**
```env
DISCORD_BOT_TOKEN=your_bot_token_here
DISCORD_GUILD_ID=your_server_id_here
```

**Bot Permissions Required:**
- View Channels
- Manage Roles
- Read Members (for guildMemberUpdate events)

**Bot Intents Required:**
- `GUILDS` - To access server information
- `GUILD_MEMBERS` - To receive member update events

### **3. Initialize the Bot**

**Option A: Via Admin UI** (Recommended)
1. Navigate to `/admin/discord/bot`
2. Click "Initialize Bot" button
3. Bot will start listening for role changes

**Option B: Via API** (For automation)
```bash
curl -X POST http://localhost:3000/api/discord/bot \
  -H "Authorization: Bearer YOUR_TOKEN"
```

---

## 🔍 Detailed Step-by-Step Flow

### **Step 1: Admin Assigns Role in Discord**

**What Happens:**
- Admin goes to Discord Server Settings → Members
- Finds the user
- Assigns the "Coach" role
- Discord sends a `guildMemberUpdate` event

**Discord UI:**
```
Server Settings → Members → [User] → Roles → ✅ Coach
```

---

### **Step 2: Bot Detects Role Change**

**Event Handler** (`lib/discord-bot-service.ts`):

```typescript
client.on(Events.GuildMemberUpdate, async (oldMember, newMember) => {
  // Check if roles changed
  const oldRoleIds = Array.from(oldMember.roles.cache.keys()).sort()
  const newRoleIds = Array.from(newMember.roles.cache.keys()).sort()
  
  if (JSON.stringify(oldRoleIds) !== JSON.stringify(newRoleIds)) {
    // Roles changed! Process it
    await handleRoleChange(oldMember, newMember)
  }
})
```

**What the Bot Checks:**
- Compares old member roles vs new member roles
- If different, triggers role sync process

---

### **Step 3: Role Sync to App**

**Function**: `syncDiscordRoleToApp()` in `lib/discord-role-sync.ts`

**Process:**
1. Fetches Discord member from server
2. Checks member's roles against mapping:
   ```typescript
   // Priority order: admin → commissioner → coach → viewer
   if (member.roles.cache.some(r => r.name === "Coach")) {
     appRole = "coach"
   }
   ```
3. Finds user in database by `discord_id`
4. Updates `profiles.role` to "coach"

**Database Update:**
```sql
UPDATE profiles 
SET role = 'coach' 
WHERE discord_id = 'discord_user_id'
```

---

### **Step 4: Coach Entry Creation**

**Function**: `assignCoachToTeam()` in `lib/coach-assignment.ts`

**Process:**
1. Checks if coach entry exists:
   ```sql
   SELECT id FROM coaches WHERE user_id = 'user_uuid'
   ```
2. If not exists, creates one:
   ```sql
   INSERT INTO coaches (user_id, display_name, email)
   VALUES ('user_uuid', 'Display Name', 'email@example.com')
   ```

---

### **Step 5: Team Assignment**

**Database Function**: `assign_coach_to_team()` in migration `20260116000013_create_coach_assignment_function.sql`

**Process:**
1. Finds available team in current season:
   ```sql
   SELECT t.id 
   FROM teams t
   INNER JOIN seasons s ON t.season_id = s.id
   WHERE t.coach_id IS NULL AND s.is_current = true
   LIMIT 1
   ```
2. Updates team:
   ```sql
   UPDATE teams 
   SET coach_id = 'coach_uuid' 
   WHERE id = 'team_uuid'
   ```
3. Updates profile:
   ```sql
   UPDATE profiles 
   SET team_id = 'team_uuid' 
   WHERE id = 'user_uuid'
   ```

---

### **Step 6: User Sees Changes**

**When user navigates to `/dashboard/profile`:**
1. Profile page loads user data
2. Checks if `role === "coach"`
3. If yes, loads team data
4. Displays `CoachCard` component with:
   - Team avatar (uploadable)
   - Team name (editable)
   - Team stats (wins, losses, differential)
   - Link to team detail page

---

## 🧪 Testing the Flow

### **Manual Test Steps:**

1. **Ensure bot is initialized:**
   - Go to `/admin/discord/bot`
   - Click "Initialize Bot"
   - Verify status shows "Connected"

2. **Assign role in Discord:**
   - Go to Discord Server Settings → Members
   - Find a test user
   - Assign "Coach" role

3. **Check bot logs:**
   - Look for console output:
     ```
     [Discord Bot] Role change detected for Username#1234
     [Discord Bot] Synced role for Username#1234: coach
     [Discord Bot] Assigned coach Username#1234 to team abc-123-def
     ```

4. **Verify in database:**
   ```sql
   SELECT p.id, p.role, p.team_id, c.id as coach_id, t.name as team_name
   FROM profiles p
   LEFT JOIN coaches c ON c.user_id = p.id
   LEFT JOIN teams t ON t.id = p.team_id
   WHERE p.discord_id = 'discord_user_id'
   ```

5. **Check profile page:**
   - User logs in
   - Navigates to `/dashboard/profile`
   - Should see coach card with team info

---

## 🐛 Troubleshooting

### **Issue: Bot not detecting role changes**

**Solutions:**
1. Verify bot is initialized: Check `/admin/discord/bot` status
2. Check bot permissions: Bot needs "Manage Roles" permission
3. Check bot intents: Ensure `GUILD_MEMBERS` intent is enabled
4. Check environment variables: `DISCORD_BOT_TOKEN` and `DISCORD_GUILD_ID`

### **Issue: Role syncs but coach not assigned to team**

**Solutions:**
1. Check if teams exist: `SELECT COUNT(*) FROM teams WHERE coach_id IS NULL`
2. Check if current season exists: `SELECT * FROM seasons WHERE is_current = true`
3. Check database function: Test `assign_coach_to_team()` manually
4. Check logs: Look for error messages in console

### **Issue: Role name doesn't match**

**Solutions:**
1. Verify Discord role name is exactly "Coach"
2. Or update mapping in `lib/discord-role-sync.ts`
3. Restart bot after changing mapping

---

## 📝 Configuration Reference

### **Role Mapping Configuration**

**File**: `lib/discord-role-sync.ts`

```typescript
// Discord → App mapping
export const DISCORD_TO_APP_ROLE_MAP: Record<string, UserRole> = {
  "Commissioner": "admin",
  "League Admin": "admin",
  "Coach": "coach",        // ← This is what triggers coach assignment
  "Spectator": "viewer",
}

// App → Discord mapping (reverse)
export const APP_TO_DISCORD_ROLE_MAP: Record<UserRole, string[]> = {
  admin: ["Commissioner", "League Admin"],
  commissioner: ["Commissioner"],
  coach: ["Coach"],        // ← Maps app role to Discord role
  viewer: ["Spectator"],
}
```

### **Database Function**

**File**: `supabase/migrations/20260116000013_create_coach_assignment_function.sql`

```sql
CREATE OR REPLACE FUNCTION public.assign_coach_to_team(
  p_user_id UUID,
  p_team_id UUID DEFAULT NULL
)
RETURNS UUID AS $$
-- Function implementation
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

---

## 🎯 Key Points

1. **Role Name Must Match**: Discord role must be exactly "Coach" (or update mapping)
2. **Bot Must Be Running**: Bot needs to be initialized to listen for events
3. **Teams Must Exist**: At least one unassigned team must exist in current season
4. **User Must Have Discord Account**: User must have logged in with Discord OAuth
5. **Automatic Process**: Once bot is running, everything happens automatically

---

## 📚 Related Files

- `lib/discord-bot-service.ts` - Bot initialization and event handlers
- `lib/discord-role-sync.ts` - Role synchronization logic
- `lib/coach-assignment.ts` - Coach assignment helpers
- `app/admin/discord/bot/page.tsx` - Bot management UI
- `app/api/discord/bot/route.ts` - Bot API endpoints
- `supabase/migrations/20260116000013_create_coach_assignment_function.sql` - Database function

---

**Ready to test!** Initialize the bot, assign a role in Discord, and watch the magic happen! ✨
