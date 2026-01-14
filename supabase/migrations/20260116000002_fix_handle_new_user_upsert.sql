-- Fix handle_new_user() to handle existing discord_id gracefully
-- Prevents "Database error saving new user" when discord_id already exists
-- Handles conflicts on both 'id' (primary key) and 'discord_id' (unique constraint)

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
      discord_username = COALESCE(NEW.raw_user_meta_data->>'user_name', discord_username),
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
      discord_username = COALESCE(NEW.raw_user_meta_data->>'user_name', discord_username),
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
      NEW.raw_user_meta_data->>'user_name',
      NEW.raw_user_meta_data->>'avatar_url',
      CASE WHEN profile_count = 0 THEN 'admin' ELSE 'viewer' END
    );
  END IF;
  
  RETURN NEW;
END;
$function$
;
