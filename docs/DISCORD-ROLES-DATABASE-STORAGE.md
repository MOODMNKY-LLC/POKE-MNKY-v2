# Discord Roles Database Storage

## Overview

Discord roles are now stored in the database for quick access and to avoid repeated API calls. This improves performance and provides a persistent record of user roles.

## Changes Made

### 1. Database Migration

**File**: `supabase/migrations/20260125000004_add_discord_roles_storage.sql`

- Added `discord_roles` JSONB column to `profiles` table
- Stores array of Discord roles: `[{"id": "role_id", "name": "Role Name", "color": "#hex", "position": 0}]`
- Added GIN index for efficient JSONB queries
- Created helper function `update_discord_roles()` for updating roles

### 2. Sync Function Updates

**File**: `lib/discord-role-sync.ts`

- `syncDiscordRoleToApp()` now saves Discord roles to database when syncing
- Roles are updated even if the app role doesn't change
- Ensures database always has current Discord role information

### 3. API Endpoint Updates

**File**: `app/api/discord/users-roles/route.ts`

- Now saves Discord roles to database when fetching them
- Updates `discord_roles` column for each user
- Returns roles from API (for immediate display) and persists to DB

### 4. UI Updates

**File**: `app/admin/discord/roles/page.tsx`

- Reads Discord roles from database by default (faster)
- Fetches fresh roles from API after sync to ensure database is updated
- Displays all Discord roles stored in database

## Database Schema

```sql
-- profiles table now includes:
discord_roles JSONB DEFAULT '[]'::jsonb

-- Example data:
[
  {
    "id": "123456789012345678",
    "name": "Coach",
    "color": "#5865F2",
    "position": 5
  },
  {
    "id": "987654321098765432",
    "name": "Member",
    "color": "#000000",
    "position": 1
  }
]
```

## How It Works

1. **On Page Load**: UI reads `discord_roles` from database (fast, no API call)
2. **On Sync**: 
   - Sync function updates app roles AND saves Discord roles to database
   - UI refreshes from database after sync completes
3. **On Manual Refresh**: API endpoint fetches fresh roles from Discord and updates database

## Benefits

- ✅ **Performance**: No need to fetch from Discord API every time
- ✅ **Persistence**: Roles stored in database for historical tracking
- ✅ **Reliability**: Works even if Discord API is temporarily unavailable
- ✅ **Efficiency**: Bulk updates instead of individual API calls

## Migration Steps

To apply the migration:

```bash
# Using Supabase CLI
supabase migration up

# Or apply manually in Supabase Dashboard SQL Editor
# Copy contents of: supabase/migrations/20260125000004_add_discord_roles_storage.sql
```

## Verification

After migration, verify the column exists:

```sql
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_name = 'profiles' 
  AND column_name = 'discord_roles';
```

Should return:
- `column_name`: `discord_roles`
- `data_type`: `jsonb`
- `column_default`: `'[]'::jsonb`

## Usage Examples

### Query users with specific Discord role:

```sql
SELECT id, display_name, discord_roles
FROM profiles
WHERE discord_roles @> '[{"name": "Coach"}]'::jsonb;
```

### Count users by Discord role:

```sql
SELECT 
  role->>'name' as discord_role,
  COUNT(*) as user_count
FROM profiles,
     jsonb_array_elements(discord_roles) as role
GROUP BY role->>'name';
```

---

**Last Updated**: 2026-01-25  
**Status**: ✅ Implemented and ready for migration
