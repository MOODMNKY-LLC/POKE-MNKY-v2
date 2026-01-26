-- Add Discord roles storage to profiles table
-- Stores all Discord roles a user has as JSONB for quick access

-- Add discord_roles column to profiles table
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS discord_roles JSONB DEFAULT '[]'::jsonb;

-- Add index for JSONB queries
CREATE INDEX IF NOT EXISTS idx_profiles_discord_roles ON public.profiles USING GIN (discord_roles);

-- Add comment
COMMENT ON COLUMN public.profiles.discord_roles IS 'Array of Discord roles the user has. Format: [{"id": "role_id", "name": "Role Name", "color": "#hex", "position": 0}]';

-- Function to update discord_roles
CREATE OR REPLACE FUNCTION public.update_discord_roles(
  user_id UUID,
  roles JSONB
)
RETURNS void AS $$
BEGIN
  UPDATE public.profiles
  SET 
    discord_roles = roles,
    updated_at = NOW()
  WHERE id = user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
