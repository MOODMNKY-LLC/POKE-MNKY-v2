-- Comprehensive RBAC System Fix
-- Migration: 20260125000003_comprehensive_rbac_fix.sql
-- 
-- This migration:
-- 1. Renames 'viewer' role to 'spectator'
-- 2. Updates role permissions with comprehensive permission strings
-- 3. Creates trigger to auto-assign admin to first authenticated user
-- 4. Creates role hierarchy helper function
-- 5. Updates permission check function to respect hierarchy

-- ============================================================================
-- 1. RENAME VIEWER TO SPECTATOR
-- ============================================================================

-- Update profiles table constraint
ALTER TABLE public.profiles 
  DROP CONSTRAINT IF EXISTS profiles_role_check;

ALTER TABLE public.profiles 
  ADD CONSTRAINT profiles_role_check 
  CHECK (role IN ('admin', 'commissioner', 'coach', 'spectator'));

-- Update existing 'viewer' roles to 'spectator'
UPDATE public.profiles 
SET role = 'spectator' 
WHERE role = 'viewer';

-- Update role_permissions table constraint
-- First drop existing constraint
ALTER TABLE public.role_permissions 
  DROP CONSTRAINT IF EXISTS role_permissions_role_check;

-- Then update existing 'viewer' roles to 'spectator'
UPDATE public.role_permissions 
SET role = 'spectator' 
WHERE role = 'viewer';

-- Then recreate constraint with new values
ALTER TABLE public.role_permissions 
  ADD CONSTRAINT role_permissions_role_check 
  CHECK (role IN ('admin', 'commissioner', 'coach', 'spectator'));

-- ============================================================================
-- 2. UPDATE ROLE PERMISSIONS WITH COMPREHENSIVE PERMISSIONS
-- ============================================================================

-- Update admin role permissions
UPDATE public.role_permissions 
SET 
  permissions = '["*"]'::jsonb,
  description = 'Full system access - can manage users, settings, and all league data',
  updated_at = NOW()
WHERE role = 'admin';

-- Update commissioner role permissions
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
  description = 'League management - can manage teams, matches, and league operations',
  updated_at = NOW()
WHERE role = 'commissioner';

-- Update coach role permissions
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
  description = 'Team management - can manage own team roster and submit match results',
  updated_at = NOW()
WHERE role = 'coach';

-- Update spectator role permissions (renamed from viewer)
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
  description = 'Read-only access to league information',
  updated_at = NOW()
WHERE role = 'spectator';

-- Insert if not exists (for new installations)
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

-- ============================================================================
-- 3. UPDATE PROFILE CREATION TRIGGER TO ASSIGN ADMIN TO FIRST USER
-- ============================================================================

-- Update handle_new_user to set default role based on user count
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

-- Create additional trigger to ensure first user gets admin (backup)
CREATE OR REPLACE FUNCTION public.handle_first_user_admin()
RETURNS TRIGGER AS $$
DECLARE
  user_count INTEGER;
BEGIN
  -- Count existing users
  SELECT COUNT(*) INTO user_count
  FROM auth.users;
  
  -- If this is the first user, ensure they have admin role
  IF user_count = 1 THEN
    UPDATE public.profiles
    SET role = 'admin'
    WHERE id = NEW.id AND (role IS NULL OR role != 'admin');
  ELSE
    -- Otherwise, ensure default is spectator (if not already set)
    UPDATE public.profiles
    SET role = COALESCE(role, 'spectator')
    WHERE id = NEW.id AND role IS NULL;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to assign admin to first user
DROP TRIGGER IF EXISTS on_first_user_admin ON auth.users;
CREATE TRIGGER on_first_user_admin
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_first_user_admin();

-- ============================================================================
-- 4. CREATE ROLE HIERARCHY HELPER FUNCTION
-- ============================================================================

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
  -- admin = 4, commissioner = 3, coach = 2, spectator = 1
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

-- Add comment
COMMENT ON FUNCTION public.user_has_role_or_higher IS 'Checks if user has the required role or a higher role in the hierarchy (admin > commissioner > coach > spectator)';

-- ============================================================================
-- 5. UPDATE PERMISSION CHECK FUNCTION TO RESPECT HIERARCHY
-- ============================================================================

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

-- ============================================================================
-- 6. UPDATE DEFAULT ROLE IN PROFILES TABLE
-- ============================================================================

-- Update default role constraint to use 'spectator' instead of 'viewer'
-- Note: The constraint is already updated above, but we ensure the default is correct
ALTER TABLE public.profiles 
  ALTER COLUMN role SET DEFAULT 'spectator';

-- ============================================================================
-- 7. VERIFICATION QUERIES (for manual checking)
-- ============================================================================

-- Uncomment to verify:
-- SELECT role, COUNT(*) as count FROM public.profiles GROUP BY role;
-- SELECT role, permissions FROM public.role_permissions ORDER BY role;
