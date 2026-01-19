-- Fix discord_username to use correct Discord OAuth field name
-- Discord OAuth provides 'username' not 'user_name' in raw_user_meta_data
-- This migration fixes the trigger and updates existing profiles

-- Update the trigger function to use 'username' instead of 'user_name'
CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  profile_count INTEGER;
  discord_id_value TEXT;
  existing_profile_id UUID;
BEGIN
  -- Check if any profiles exist at all (for first user admin logic)
  SELECT COUNT(*) INTO profile_count
  FROM public.profiles;
  
  -- Get discord_id from metadata
  discord_id_value := NEW.raw_user_meta_data->>'provider_id';
  
  -- Check if profile with this discord_id already exists
  SELECT id INTO existing_profile_id
  FROM public.profiles
  WHERE discord_id = discord_id_value
    AND discord_id IS NOT NULL
  LIMIT 1;
  
  -- If profile exists with same discord_id but different id, update it
  IF existing_profile_id IS NOT NULL AND existing_profile_id != NEW.id THEN
    UPDATE public.profiles
    SET 
      id = NEW.id, -- Link to new auth.users record
      display_name = COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email, display_name),
      avatar_url = COALESCE(NEW.raw_user_meta_data->>'avatar_url', avatar_url),
      email_verified = COALESCE(NEW.email_confirmed_at IS NOT NULL, email_verified),
      discord_username = COALESCE(NEW.raw_user_meta_data->>'username', discord_username), -- FIXED: 'username' not 'user_name'
      discord_avatar = COALESCE(NEW.raw_user_meta_data->>'avatar_url', discord_avatar),
      updated_at = NOW()
    WHERE id = existing_profile_id;
  -- If profile with this id already exists, update it
  ELSIF EXISTS (SELECT 1 FROM public.profiles WHERE id = NEW.id) THEN
    UPDATE public.profiles
    SET 
      display_name = COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email, display_name),
      avatar_url = COALESCE(NEW.raw_user_meta_data->>'avatar_url', avatar_url),
      email_verified = COALESCE(NEW.email_confirmed_at IS NOT NULL, email_verified),
      discord_id = COALESCE(discord_id_value, discord_id),
      discord_username = COALESCE(NEW.raw_user_meta_data->>'username', discord_username), -- FIXED: 'username' not 'user_name'
      discord_avatar = COALESCE(NEW.raw_user_meta_data->>'avatar_url', discord_avatar),
      updated_at = NOW()
    WHERE id = NEW.id;
  -- Otherwise, insert new profile
  ELSE
    INSERT INTO public.profiles (id, display_name, avatar_url, email_verified, discord_id, discord_username, discord_avatar, role)
    VALUES (
      NEW.id,
      COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
      NEW.raw_user_meta_data->>'avatar_url',
      NEW.email_confirmed_at IS NOT NULL,
      discord_id_value,
      NEW.raw_user_meta_data->>'username', -- FIXED: 'username' not 'user_name'
      NEW.raw_user_meta_data->>'avatar_url',
      CASE WHEN profile_count = 0 THEN 'admin' ELSE 'viewer' END
    );
  END IF;
  
  RETURN NEW;
END;
$function$;

-- Update existing profiles to populate discord_username from auth.users raw_user_meta_data
-- This fixes profiles that were created before the trigger was fixed
UPDATE public.profiles p
SET discord_username = COALESCE(
  (SELECT raw_user_meta_data->>'username' FROM auth.users WHERE id = p.id),
  discord_username
)
WHERE discord_username IS NULL
  AND EXISTS (
    SELECT 1 FROM auth.users 
    WHERE id = p.id 
    AND raw_user_meta_data->>'username' IS NOT NULL
  );
