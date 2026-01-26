# RBAC Implementation Summary

## ✅ Completed Changes

### 1. Database Migration (`20260125000003_comprehensive_rbac_fix.sql`)
- ✅ Renamed `viewer` role to `spectator` in schema
- ✅ Updated role permissions with comprehensive permission strings
- ✅ Created trigger to auto-assign admin to first authenticated user
- ✅ Created `user_has_role_or_higher()` function for hierarchy checking
- ✅ Updated `user_has_permission()` function

### 2. Code Updates
- ✅ Updated `lib/rbac.ts`:
  - Renamed `UserRole.VIEWER` → `UserRole.SPECTATOR`
  - Added comprehensive permission strings
  - Added `hasRoleOrHigher()` helper function
  - Added `requireRoleOrHigher()` helper function
  - Fixed `requirePermission()` bug (was missing permission parameter)

- ✅ Updated `lib/discord-role-sync.ts`:
  - Updated role mappings: `viewer` → `spectator`
  - Updated default role in sync function

- ✅ Updated UI Components:
  - `app/admin/users/page.tsx` - Updated role dropdowns
  - `app/admin/discord/roles/page.tsx` - Updated role types
  - `app/admin/discord/bot/page.tsx` - Updated badge text
  - `app/dashboard/free-agency/page.tsx` - Updated default role
  - `app/page.tsx` - Updated description text

- ✅ Updated API Routes:
  - `app/api/discord/sync-user-role/route.ts` - Updated valid roles

## 📋 Discord Role Mapping

### Current Discord Role Names Required:
- **"Commissioner"** → Maps to `admin` or `commissioner` app role
- **"League Admin"** → Maps to `admin` app role
- **"Coach"** → Maps to `coach` app role
- **"Spectator"** → Maps to `spectator` app role

### App → Discord Mapping:
```typescript
admin → ["Commissioner", "League Admin"]
commissioner → ["Commissioner"]
coach → ["Coach"]
spectator → ["Spectator"]
```

### Discord → App Mapping:
```typescript
"Commissioner" → admin (highest priority)
"League Admin" → admin
"Coach" → coach
"Spectator" → spectator (default)
```

## 🔧 Next Steps (Optional Improvements)

### 1. Update API Routes to Use Role Hierarchy
Some routes currently use direct role checks. Consider updating to use `hasRoleOrHigher()`:

**Routes that should allow commissioner access:**
- `/api/free-agency/process` - Currently admin-only, should allow commissioner
- `/api/admin/assign-coach` - ✅ Already allows commissioner
- `/api/discord/config` - ✅ Already allows commissioner

**Routes that should remain admin-only:**
- `/api/discord/sync-roles` - System integration management
- `/api/discord/sync-user-role` - System integration management
- `/api/discord/bot` - Bot configuration
- `/api/admin/storage` - System storage management
- `/api/admin/pokemon` - Pokemon data management

### 2. Update RLS Policies
Most RLS policies already check for admin role. Consider updating to allow commissioner where appropriate:

**Policies that might need updates:**
- Team management policies (commissioner should manage teams)
- Match management policies (commissioner should manage matches)
- Trade management policies (commissioner should manage trades)

**Example RLS Policy Update:**
```sql
-- Instead of:
USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'))

-- Use:
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() 
    AND role IN ('admin', 'commissioner')
  )
)
```

### 3. Test First User Admin Assignment
After running the migration, verify:
1. First authenticated user gets `admin` role automatically
2. Subsequent users get `spectator` role by default
3. Discord role sync works correctly with new role names

## 🚀 Deployment Checklist

- [ ] Run migration: `supabase migration up`
- [ ] Verify first user has admin role
- [ ] Verify Discord roles exist: "Commissioner", "League Admin", "Coach", "Spectator"
- [ ] Test Discord role sync (Discord → App)
- [ ] Test Discord role sync (App → Discord)
- [ ] Verify API routes work with new role hierarchy
- [ ] Update any custom scripts that reference "viewer" role

## 📝 Notes

### Role Hierarchy
```
admin > commissioner > coach > spectator
```

Higher roles inherit permissions from lower roles. For example:
- Admin can perform all commissioner, coach, and spectator operations
- Commissioner can perform all coach and spectator operations
- Coach can perform all spectator operations
- Spectator has read-only access

### Permission Strings
See `lib/rbac.ts` for complete list of permission strings. Key categories:
- System permissions: `manage:users`, `manage:system`, `manage:integrations`
- League permissions: `manage:league`, `manage:teams`, `manage:matches`
- Team permissions: `manage:own_team`, `manage:own_roster`
- View permissions: `view:league`, `view:standings`, `view:schedule`

### Discord Integration
The Discord role sync system is fully compatible with the new RBAC system. Ensure your Discord server has these roles:
- **Commissioner** (or **League Admin**) - For admin users
- **Commissioner** - For commissioner users (can be same as admin role)
- **Coach** - For coach users
- **Spectator** - For spectator users

Role names are **case-sensitive** and must match exactly!
