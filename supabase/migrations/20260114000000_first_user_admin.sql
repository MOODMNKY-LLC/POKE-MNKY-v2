-- Make first user admin by default
-- Updates handle_new_user() function to check if any profiles exist
-- If no profiles exist, the first user gets admin role

CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  profile_count INTEGER;
BEGIN
  -- Check if any profiles exist at all
  SELECT COUNT(*) INTO profile_count
  FROM public.profiles;
  
  -- If no profiles exist, this is the first user - make them admin
  -- Otherwise, use default 'viewer' role (from table default)
  INSERT INTO public.profiles (id, display_name, avatar_url, email_verified, discord_id, discord_username, discord_avatar, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    NEW.raw_user_meta_data->>'avatar_url',
    NEW.email_confirmed_at IS NOT NULL,
    NEW.raw_user_meta_data->>'provider_id',
    NEW.raw_user_meta_data->>'user_name',
    NEW.raw_user_meta_data->>'avatar_url',
    CASE WHEN profile_count = 0 THEN 'admin' ELSE 'viewer' END
  );
  RETURN NEW;
END;
$function$
;
