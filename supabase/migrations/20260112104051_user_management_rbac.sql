-- User Management System with Role-Based Access Control (RBAC)
-- Based on Supabase Next.js User Management Tutorial

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Profiles table (extends auth.users with application-specific fields)
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Basic profile info
  username TEXT UNIQUE,
  display_name TEXT,
  avatar_url TEXT,
  bio TEXT,
  
  -- Role & Permissions
  role TEXT NOT NULL DEFAULT 'viewer' CHECK (role IN ('admin', 'commissioner', 'coach', 'viewer')),
  permissions JSONB DEFAULT '[]'::jsonb,
  
  -- League-specific fields
  team_id UUID REFERENCES public.teams(id) ON DELETE SET NULL,
  discord_id TEXT UNIQUE,
  discord_username TEXT,
  discord_avatar TEXT,
  
  -- Metadata
  is_active BOOLEAN DEFAULT TRUE,
  email_verified BOOLEAN DEFAULT FALSE,
  onboarding_completed BOOLEAN DEFAULT FALSE,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  last_seen_at TIMESTAMPTZ
);

-- Create function to handle new user creation
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, display_name, avatar_url, email_verified, discord_id, discord_username, discord_avatar)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    NEW.raw_user_meta_data->>'avatar_url',
    NEW.email_confirmed_at IS NOT NULL,
    NEW.raw_user_meta_data->>'provider_id',
    NEW.raw_user_meta_data->>'user_name',
    NEW.raw_user_meta_data->>'avatar_url'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to create profile on user signup
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update updated_at on profile changes
DROP TRIGGER IF EXISTS on_profile_updated ON public.profiles;
CREATE TRIGGER on_profile_updated
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- Row Level Security (RLS) Policies
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Everyone can view public profile information
CREATE POLICY "Public profiles are viewable by everyone"
  ON public.profiles FOR SELECT
  USING (true);

-- Users can insert their own profile (handled by trigger)
CREATE POLICY "Users can insert their own profile"
  ON public.profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

-- Users can update their own profile
CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Admins can update any profile
CREATE POLICY "Admins can update any profile"
  ON public.profiles FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Admins can delete profiles
CREATE POLICY "Admins can delete profiles"
  ON public.profiles FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Role & Permission Management Table
CREATE TABLE IF NOT EXISTS public.role_permissions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  role TEXT NOT NULL UNIQUE CHECK (role IN ('admin', 'commissioner', 'coach', 'viewer')),
  permissions JSONB NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert default role permissions
INSERT INTO public.role_permissions (role, permissions, description) VALUES
  ('admin', '["*"]'::jsonb, 'Full system access - can manage users, settings, and all league data'),
  ('commissioner', '["manage:league", "manage:teams", "manage:matches", "manage:trades", "view:analytics"]'::jsonb, 'League management - can manage teams, matches, and league operations'),
  ('coach', '["manage:own_team", "submit:results", "propose:trades", "view:league"]'::jsonb, 'Team management - can manage own team roster and submit match results'),
  ('viewer', '["view:league", "view:standings", "view:schedule"]'::jsonb, 'Read-only access to league information')
ON CONFLICT (role) DO UPDATE SET
  permissions = EXCLUDED.permissions,
  description = EXCLUDED.description,
  updated_at = NOW();

-- Enable RLS on role_permissions
ALTER TABLE public.role_permissions ENABLE ROW LEVEL SECURITY;

-- Everyone can view role permissions
CREATE POLICY "Public role permissions are viewable"
  ON public.role_permissions FOR SELECT
  USING (true);

-- Only admins can modify role permissions
CREATE POLICY "Admins can modify role permissions"
  ON public.role_permissions FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- User Activity Log
CREATE TABLE IF NOT EXISTS public.user_activity_log (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  action TEXT NOT NULL,
  resource_type TEXT,
  resource_id UUID,
  metadata JSONB,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS on activity log
ALTER TABLE public.user_activity_log ENABLE ROW LEVEL SECURITY;

-- Users can view their own activity
CREATE POLICY "Users can view own activity"
  ON public.user_activity_log FOR SELECT
  USING (auth.uid() = user_id);

-- Admins can view all activity
CREATE POLICY "Admins can view all activity"
  ON public.user_activity_log FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- System can insert activity logs
CREATE POLICY "Authenticated users can log activity"
  ON public.user_activity_log FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_profiles_role ON public.profiles(role);
CREATE INDEX IF NOT EXISTS idx_profiles_team_id ON public.profiles(team_id);
CREATE INDEX IF NOT EXISTS idx_profiles_discord_id ON public.profiles(discord_id);
CREATE INDEX IF NOT EXISTS idx_profiles_username ON public.profiles(username);
CREATE INDEX IF NOT EXISTS idx_user_activity_user_id ON public.user_activity_log(user_id);
CREATE INDEX IF NOT EXISTS idx_user_activity_action ON public.user_activity_log(action);
CREATE INDEX IF NOT EXISTS idx_user_activity_created_at ON public.user_activity_log(created_at DESC);

-- Helper function to check if user has permission
CREATE OR REPLACE FUNCTION public.user_has_permission(user_id UUID, required_permission TEXT)
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

-- Helper function to get user's full permissions list
CREATE OR REPLACE FUNCTION public.get_user_permissions(user_id UUID)
RETURNS JSONB AS $$
DECLARE
  user_role TEXT;
  user_perms JSONB;
  role_perms JSONB;
  combined_perms JSONB;
BEGIN
  -- Get user's role and custom permissions
  SELECT role, permissions INTO user_role, user_perms
  FROM public.profiles
  WHERE id = user_id;
  
  -- Get role's default permissions
  SELECT permissions INTO role_perms
  FROM public.role_permissions
  WHERE role = user_role;
  
  -- Combine permissions (custom permissions override role permissions)
  combined_perms = COALESCE(role_perms, '[]'::jsonb) || COALESCE(user_perms, '[]'::jsonb);
  
  RETURN combined_perms;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- View for user management (admins only)
CREATE OR REPLACE VIEW public.user_management_view AS
SELECT 
  p.id,
  p.username,
  p.display_name,
  p.avatar_url,
  p.role,
  p.team_id,
  t.name as team_name,
  p.discord_id,
  p.discord_username,
  p.is_active,
  p.email_verified,
  p.onboarding_completed,
  p.created_at,
  p.updated_at,
  p.last_seen_at,
  au.email,
  au.last_sign_in_at,
  (SELECT COUNT(*) FROM public.user_activity_log WHERE user_id = p.id) as activity_count
FROM public.profiles p
LEFT JOIN public.teams t ON p.team_id = t.id
LEFT JOIN auth.users au ON p.id = au.id;

-- Grant access to user management view
GRANT SELECT ON public.user_management_view TO authenticated;
