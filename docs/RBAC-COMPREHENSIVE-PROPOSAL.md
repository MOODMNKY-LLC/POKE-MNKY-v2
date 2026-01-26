# Comprehensive RBAC System Proposal - POKE MNKY

## Executive Summary

This document proposes a definitive Role-Based Access Control (RBAC) system for POKE MNKY with clear role hierarchy, comprehensive permissions, and proper enforcement mechanisms. The system will ensure the first authenticated user is automatically assigned the admin role, and all subsequent users follow a clear permission structure.

---

## 1. Role Hierarchy

### Hierarchy Definition
```
admin > commissioner > coach > spectator
```

**Key Principle:** Higher roles inherit permissions from lower roles. For example:
- Admin can perform all commissioner, coach, and spectator operations
- Commissioner can perform all coach and spectator operations
- Coach can perform all spectator operations
- Spectator has read-only access

---

## 2. Role Definitions & Permissions

### 2.1 Admin Role (`admin`)

**Purpose:** Full system access for application development, maintenance, and administration.

**Permissions:** `["*"]` (wildcard - all permissions)

**Access Includes:**

#### System Administration
- ✅ **User Management**
  - Create, read, update, delete all user profiles
  - Assign/change user roles (admin, commissioner, coach, spectator)
  - Activate/deactivate users
  - View all user activity logs
  - Manage user authentication settings

- ✅ **System Configuration**
  - Environment variable management
  - Database administration (via Platform Kit)
  - System settings and configuration
  - Feature flags and toggles
  - API key management

- ✅ **Integration Management**
  - Discord bot configuration and management
  - Discord role mapping and synchronization
  - Google Sheets sync configuration
  - Webhook management
  - External API integrations

- ✅ **Platform Kit Access**
  - Full Supabase Platform Manager access
  - Database query execution
  - Storage bucket management
  - Auth provider configuration
  - Logs and monitoring

#### League Administration (Inherits Commissioner)
- ✅ All commissioner permissions (see below)

#### Development & Maintenance
- ✅ **Pokemon Data Management**
  - Populate/manage Pokemon cache
  - Import/export draft pool data
  - Manage Pokemon stats and metadata
  - Sync with external Pokemon APIs

- ✅ **Data Management**
  - Manual data synchronization
  - Database migrations and schema changes
  - Backup and restore operations
  - Data export and import

- ✅ **Analytics & Monitoring**
  - View all analytics dashboards
  - Access system logs
  - Monitor API usage
  - Performance metrics

---

### 2.2 Commissioner Role (`commissioner`)

**Purpose:** League-specific administration without system-level access.

**Permissions:**
```json
[
  "manage:league",
  "manage:seasons",
  "manage:conferences",
  "manage:divisions",
  "manage:teams",
  "manage:coaches",
  "manage:matches",
  "manage:matchweeks",
  "manage:trades",
  "manage:draft",
  "manage:free_agency",
  "approve:results",
  "approve:trades",
  "view:analytics",
  "view:all_teams",
  "view:all_coaches"
]
```

**Access Includes:**

#### League Management
- ✅ **Season Management**
  - Create, update, delete seasons
  - Set current season
  - Configure season dates and settings

- ✅ **Structure Management**
  - Create, update, delete conferences
  - Create, update, delete divisions
  - Assign teams to divisions/conferences

- ✅ **Team Management**
  - Create, update, delete teams
  - Assign coaches to teams (via admin dashboard)
  - Manage team rosters (view all teams)
  - Update team information
  - Manage draft budgets

- ✅ **Coach Management**
  - Assign coaches to teams
  - Remove coaches from teams
  - View all coach profiles
  - Manage coach-team relationships

#### Match Management
- ✅ **Match Operations**
  - Create scheduled matches
  - Update match details
  - Approve/reject match results
  - Resolve match disputes
  - Cancel matches
  - Manage matchweeks

- ✅ **Result Approval**
  - Review submitted match results
  - Approve or reject results
  - Override incorrect results
  - Add match notes

#### Trade Management
- ✅ **Trade Operations**
  - View all trade proposals
  - Approve/reject trades
  - Process trade transactions
  - Manage trade listings
  - View trade history

#### Draft Management
- ✅ **Draft Operations**
  - Create draft sessions
  - Manage draft pool
  - Monitor draft progress
  - Resolve draft disputes
  - Configure draft settings

#### Free Agency Management
- ✅ **Free Agency Operations**
  - View all free agency transactions
  - Process free agency claims
  - Manage transaction limits
  - Approve/reject free agency moves

#### Analytics & Reporting
- ✅ **View Analytics**
  - League-wide statistics
  - Team performance metrics
  - Match statistics
  - Trade analytics
  - Draft analytics

**Restrictions:**
- ❌ Cannot manage users or roles (admin-only)
- ❌ Cannot access system configuration
- ❌ Cannot manage integrations (Discord, Google Sheets)
- ❌ Cannot access Platform Kit
- ❌ Cannot manage Pokemon data (admin-only)

---

### 2.3 Coach Role (`coach`)

**Purpose:** Team-specific management for assigned coaches.

**Permissions:**
```json
[
  "manage:own_team",
  "manage:own_roster",
  "submit:results",
  "propose:trades",
  "create:battles",
  "use:ai_features",
  "view:league",
  "view:standings",
  "view:schedule",
  "view:own_team"
]
```

**Access Includes:**

#### Own Team Management
- ✅ **Roster Management**
  - View own team roster
  - Add/remove Pokemon from own roster (within draft budget)
  - Manage team Pokemon (within constraints)
  - View draft budget and remaining points

- ✅ **Team Builder**
  - Access team builder (`/teams/builder`)
  - Build and save teams
  - Type coverage analysis
  - Moveset recommendations

- ✅ **Team Information**
  - Update own team information (limited fields)
  - View own team statistics
  - View own team performance

#### Match Participation
- ✅ **Result Submission**
  - Submit match results (`/matches/submit`)
  - Enter scores (wins/losses)
  - Calculate differential
  - Add replay links
  - Use AI result parsing

- ✅ **Battle Creation**
  - Create official battles (`/api/battle/create`)
  - Play turn-by-turn battles
  - Challenge other coaches

#### Trade Operations
- ✅ **Trade Proposals**
  - Propose trades with other teams
  - View trade offers for own team
  - Accept/reject trade offers
  - Create trade listings

#### AI Features
- ✅ **AI Assistant**
  - Access AI Pokedex (`/pokedex`)
  - Ask strategy questions
  - Get coaching advice (`/insights`)
  - View personalized team insights
  - Use AI battle strategy

#### Viewing Access
- ✅ **League Information**
  - View standings
  - View schedule
  - View other teams (read-only)
  - View match results
  - View trade listings

**Restrictions:**
- ❌ Cannot manage other teams
- ❌ Cannot approve match results (commissioner-only)
- ❌ Cannot manage league structure
- ❌ Cannot assign coaches
- ❌ Cannot access admin dashboard
- ❌ Cannot view all user activity logs

**Note:** Coach must be assigned to a team (`profiles.team_id IS NOT NULL`) to perform team management operations.

---

### 2.4 Spectator Role (`spectator`)

**Purpose:** Read-only access for viewing league information.

**Permissions:**
```json
[
  "view:league",
  "view:standings",
  "view:schedule",
  "view:teams",
  "view:matches",
  "view:trades",
  "view:pokemon",
  "view:public_data"
]
```

**Access Includes:**

#### Viewing Access
- ✅ **Public League Data**
  - View standings
  - View schedule
  - View match results
  - View team rosters (read-only)
  - View trade listings (read-only)
  - View Pokemon information

- ✅ **Basic Features**
  - Browse Pokemon database
  - View league statistics (public)
  - View team information
  - View coach profiles (public info)

**Restrictions:**
- ❌ Cannot submit match results
- ❌ Cannot manage teams
- ❌ Cannot propose trades
- ❌ Cannot use AI features (coach-specific)
- ❌ Cannot access team builder
- ❌ Cannot create battles
- ❌ Cannot access admin dashboard
- ❌ Cannot view analytics (commissioner/admin only)

**Note:** This is the default role for new authenticated users (unless they are the first user, who becomes admin).

---

## 3. Permission String Reference

### System Permissions
- `*` - All permissions (admin only)
- `manage:users` - User management
- `manage:roles` - Role assignment
- `manage:system` - System configuration
- `manage:integrations` - Integration management
- `manage:platform_kit` - Platform Kit access

### League Permissions
- `manage:league` - General league management
- `manage:seasons` - Season management
- `manage:conferences` - Conference management
- `manage:divisions` - Division management
- `manage:teams` - Team management (all teams)
- `manage:coaches` - Coach assignment/management
- `manage:matches` - Match management
- `manage:matchweeks` - Matchweek management
- `manage:trades` - Trade management
- `manage:draft` - Draft management
- `manage:free_agency` - Free agency management
- `approve:results` - Approve match results
- `approve:trades` - Approve trades

### Team Permissions
- `manage:own_team` - Manage own team
- `manage:own_roster` - Manage own team roster
- `view:own_team` - View own team details
- `view:all_teams` - View all teams (commissioner/admin)

### Match Permissions
- `submit:results` - Submit match results
- `create:battles` - Create battle sessions

### Trade Permissions
- `propose:trades` - Propose trades

### View Permissions
- `view:league` - View league information
- `view:standings` - View standings
- `view:schedule` - View schedule
- `view:teams` - View teams
- `view:matches` - View matches
- `view:trades` - View trades
- `view:pokemon` - View Pokemon data
- `view:public_data` - View public data
- `view:analytics` - View analytics
- `view:all_coaches` - View all coaches (commissioner/admin)

### AI Permissions
- `use:ai_features` - Use AI assistant features

---

## 4. Implementation Plan

### 4.1 Database Changes

#### A. Update Role Enum
```sql
-- Update profiles table to rename 'viewer' to 'spectator'
ALTER TABLE public.profiles 
  DROP CONSTRAINT IF EXISTS profiles_role_check;

ALTER TABLE public.profiles 
  ADD CONSTRAINT profiles_role_check 
  CHECK (role IN ('admin', 'commissioner', 'coach', 'spectator'));

-- Update existing 'viewer' roles to 'spectator'
UPDATE public.profiles 
SET role = 'spectator' 
WHERE role = 'viewer';
```

#### B. Update Role Permissions Table
```sql
-- Update role_permissions table
ALTER TABLE public.role_permissions 
  DROP CONSTRAINT IF EXISTS role_permissions_role_check;

ALTER TABLE public.role_permissions 
  ADD CONSTRAINT role_permissions_role_check 
  CHECK (role IN ('admin', 'commissioner', 'coach', 'spectator'));

-- Update role permissions with comprehensive permissions
UPDATE public.role_permissions 
SET 
  permissions = '["*"]'::jsonb,
  description = 'Full system access - can manage users, settings, and all league data'
WHERE role = 'admin';

UPDATE public.role_permissions 
SET 
  permissions = '[
    "manage:league",
    "manage:seasons",
    "manage:conferences",
    "manage:divisions",
    "manage:teams",
    "manage:coaches",
    "manage:matches",
    "manage:matchweeks",
    "manage:trades",
    "manage:draft",
    "manage:free_agency",
    "approve:results",
    "approve:trades",
    "view:analytics",
    "view:all_teams",
    "view:all_coaches"
  ]'::jsonb,
  description = 'League management - can manage teams, matches, and league operations'
WHERE role = 'commissioner';

UPDATE public.role_permissions 
SET 
  permissions = '[
    "manage:own_team",
    "manage:own_roster",
    "submit:results",
    "propose:trades",
    "create:battles",
    "use:ai_features",
    "view:league",
    "view:standings",
    "view:schedule",
    "view:own_team"
  ]'::jsonb,
  description = 'Team management - can manage own team roster and submit match results'
WHERE role = 'coach';

UPDATE public.role_permissions 
SET 
  permissions = '[
    "view:league",
    "view:standings",
    "view:schedule",
    "view:teams",
    "view:matches",
    "view:trades",
    "view:pokemon",
    "view:public_data"
  ]'::jsonb,
  description = 'Read-only access to league information'
WHERE role = 'spectator';

-- Insert if not exists
INSERT INTO public.role_permissions (role, permissions, description) VALUES
  ('admin', '["*"]'::jsonb, 'Full system access - can manage users, settings, and all league data'),
  ('commissioner', '[
    "manage:league",
    "manage:seasons",
    "manage:conferences",
    "manage:divisions",
    "manage:teams",
    "manage:coaches",
    "manage:matches",
    "manage:matchweeks",
    "manage:trades",
    "manage:draft",
    "manage:free_agency",
    "approve:results",
    "approve:trades",
    "view:analytics",
    "view:all_teams",
    "view:all_coaches"
  ]'::jsonb, 'League management - can manage teams, matches, and league operations'),
  ('coach', '[
    "manage:own_team",
    "manage:own_roster",
    "submit:results",
    "propose:trades",
    "create:battles",
    "use:ai_features",
    "view:league",
    "view:standings",
    "view:schedule",
    "view:own_team"
  ]'::jsonb, 'Team management - can manage own team roster and submit match results'),
  ('spectator', '[
    "view:league",
    "view:standings",
    "view:schedule",
    "view:teams",
    "view:matches",
    "view:trades",
    "view:pokemon",
    "view:public_data"
  ]'::jsonb, 'Read-only access to league information')
ON CONFLICT (role) DO UPDATE SET
  permissions = EXCLUDED.permissions,
  description = EXCLUDED.description,
  updated_at = NOW();
```

#### C. Create First User Admin Trigger
```sql
-- Function to assign admin role to first user
CREATE OR REPLACE FUNCTION public.handle_first_user_admin()
RETURNS TRIGGER AS $$
DECLARE
  user_count INTEGER;
BEGIN
  -- Count existing users
  SELECT COUNT(*) INTO user_count
  FROM auth.users;
  
  -- If this is the first user, assign admin role
  IF user_count = 1 THEN
    UPDATE public.profiles
    SET role = 'admin'
    WHERE id = NEW.id;
  ELSE
    -- Otherwise, default to spectator
    UPDATE public.profiles
    SET role = 'spectator'
    WHERE id = NEW.id AND role IS NULL;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to assign admin to first user
DROP TRIGGER IF EXISTS on_first_user_admin ON auth.users;
CREATE TRIGGER on_first_user_admin
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_first_user_admin();
```

#### D. Update Profile Creation Trigger
```sql
-- Update handle_new_user to set default role to spectator (not viewer)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  user_count INTEGER;
  default_role TEXT;
BEGIN
  -- Count existing users (including this one)
  SELECT COUNT(*) INTO user_count
  FROM auth.users;
  
  -- First user gets admin, others get spectator
  IF user_count = 1 THEN
    default_role := 'admin';
  ELSE
    default_role := 'spectator';
  END IF;
  
  INSERT INTO public.profiles (
    id, 
    display_name, 
    avatar_url, 
    email_verified, 
    discord_id, 
    discord_username, 
    discord_avatar,
    role
  )
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    NEW.raw_user_meta_data->>'avatar_url',
    NEW.email_confirmed_at IS NOT NULL,
    NEW.raw_user_meta_data->>'provider_id',
    NEW.raw_user_meta_data->>'user_name',
    NEW.raw_user_meta_data->>'avatar_url',
    default_role
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

#### E. Create Role Hierarchy Helper Function
```sql
-- Function to check if user has role or higher role
CREATE OR REPLACE FUNCTION public.user_has_role_or_higher(
  user_id UUID,
  required_role TEXT
)
RETURNS BOOLEAN AS $$
DECLARE
  user_role TEXT;
  role_hierarchy INTEGER;
  required_hierarchy INTEGER;
BEGIN
  -- Get user's role
  SELECT role INTO user_role
  FROM public.profiles
  WHERE id = user_id;
  
  IF user_role IS NULL THEN
    RETURN FALSE;
  END IF;
  
  -- Define role hierarchy (higher number = higher privilege)
  CASE user_role
    WHEN 'admin' THEN role_hierarchy := 4;
    WHEN 'commissioner' THEN role_hierarchy := 3;
    WHEN 'coach' THEN role_hierarchy := 2;
    WHEN 'spectator' THEN role_hierarchy := 1;
    ELSE role_hierarchy := 0;
  END CASE;
  
  CASE required_role
    WHEN 'admin' THEN required_hierarchy := 4;
    WHEN 'commissioner' THEN required_hierarchy := 3;
    WHEN 'coach' THEN required_hierarchy := 2;
    WHEN 'spectator' THEN required_hierarchy := 1;
    ELSE required_hierarchy := 0;
  END CASE;
  
  -- User has role if their hierarchy >= required hierarchy
  RETURN role_hierarchy >= required_hierarchy;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

#### F. Update Permission Check Function
```sql
-- Update user_has_permission to respect role hierarchy
CREATE OR REPLACE FUNCTION public.user_has_permission(
  user_id UUID, 
  required_permission TEXT
)
RETURNS BOOLEAN AS $$
DECLARE
  user_role TEXT;
  user_permissions JSONB;
  role_permissions JSONB;
BEGIN
  -- Get user's role and custom permissions
  SELECT role, permissions INTO user_role, user_permissions
  FROM public.profiles
  WHERE id = user_id;
  
  -- Admin has all permissions
  IF user_role = 'admin' THEN
    RETURN TRUE;
  END IF;
  
  -- Get role's default permissions
  SELECT permissions INTO role_permissions
  FROM public.role_permissions
  WHERE role = user_role;
  
  -- Check if permission exists in role permissions or user's custom permissions
  RETURN (
    role_permissions ? required_permission OR
    user_permissions ? required_permission OR
    role_permissions ? '*' OR
    user_permissions ? '*'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

### 4.2 Code Changes

#### A. Update `lib/rbac.ts`
- Rename `UserRole.VIEWER` to `UserRole.SPECTATOR`
- Update `Permissions` object with comprehensive permission strings
- Add `hasRoleOrHigher()` helper function
- Update `requireRole()` to use hierarchy checking

#### B. Update API Routes
- Replace hardcoded `role === "admin"` checks with `hasRoleOrHigher()`
- Update commissioner operations to allow admin access
- Add proper permission checks using permission strings

#### C. Update RLS Policies
- Update policies to check for role hierarchy
- Allow higher roles to perform lower role operations

---

## 5. Migration Strategy

### Phase 1: Database Migration
1. Create migration file with all SQL changes
2. Update role enum (viewer → spectator)
3. Update role_permissions table
4. Create first user admin trigger
5. Create role hierarchy helper function

### Phase 2: Code Updates
1. Update `lib/rbac.ts` with new role and permissions
2. Update all API routes to use hierarchy checking
3. Update RLS policies
4. Update UI components that reference "viewer" role

### Phase 3: Testing
1. Test first user admin assignment
2. Test role hierarchy enforcement
3. Test permission checks
4. Test API route protection
5. Test RLS policies

---

## 6. Security Considerations

1. **First User Protection:** Ensure only the first authenticated user gets admin role
2. **Role Hierarchy Enforcement:** Always check hierarchy, not just exact role match
3. **Permission Granularity:** Use specific permission strings, not just roles
4. **RLS Policy Updates:** Ensure policies respect hierarchy
5. **API Route Protection:** All routes must check permissions, not just roles
6. **Audit Logging:** Log all role changes and permission checks

---

## 7. Testing Checklist

- [ ] First authenticated user automatically gets admin role
- [ ] Subsequent users default to spectator role
- [ ] Admin can perform all operations
- [ ] Commissioner can perform league operations but not system operations
- [ ] Coach can manage own team but not other teams
- [ ] Spectator has read-only access
- [ ] Role hierarchy is enforced in API routes
- [ ] RLS policies respect hierarchy
- [ ] Permission checks work correctly
- [ ] UI reflects role changes correctly

---

## 8. Next Steps

1. **Review this proposal** - Ensure it aligns with your requirements
2. **Approve changes** - Confirm permission structure and implementation plan
3. **Create migration** - Generate SQL migration file
4. **Update code** - Modify TypeScript files
5. **Test thoroughly** - Verify all functionality
6. **Deploy** - Apply changes to production

---

**Document Status:** Proposal - Awaiting Approval
**Created:** 2026-01-25
**Author:** AI Assistant (Composer)
