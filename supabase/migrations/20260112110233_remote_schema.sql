create extension if not exists "pg_cron" with schema "pg_catalog";

create extension if not exists "wrappers" with schema "extensions";

set check_function_bodies = off;

CREATE OR REPLACE FUNCTION public.get_user_permissions(user_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
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
$function$
;

CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
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
$function$
;

CREATE OR REPLACE FUNCTION public.handle_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.user_has_permission(user_id uuid, required_permission text)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
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
$function$
;


