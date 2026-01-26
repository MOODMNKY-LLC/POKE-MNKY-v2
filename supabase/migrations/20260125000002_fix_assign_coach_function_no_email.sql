-- Fix assign_coach_to_team function to remove email reference
-- Profiles table doesn't have email column - we use Discord credentials instead
-- Migration: 20260125000002_fix_assign_coach_function_no_email.sql

CREATE OR REPLACE FUNCTION public.assign_coach_to_team(
  p_user_id UUID,
  p_team_id UUID DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  v_coach_id UUID;
  v_team_id UUID;
  v_profile_display_name TEXT;
  v_profile_discord_id TEXT;
BEGIN
  -- Get profile info (no email - using Discord credentials)
  SELECT display_name, discord_id INTO v_profile_display_name, v_profile_discord_id
  FROM public.profiles
  WHERE id = p_user_id;
  
  IF v_profile_display_name IS NULL THEN
    RAISE EXCEPTION 'User profile not found for user_id: %', p_user_id;
  END IF;
  
  -- Get or create coach entry
  SELECT id INTO v_coach_id
  FROM public.coaches
  WHERE user_id = p_user_id;
  
  IF v_coach_id IS NULL THEN
    -- Insert coach without email (using Discord credentials instead)
    INSERT INTO public.coaches (user_id, display_name, discord_id, email)
    VALUES (p_user_id, v_profile_display_name, v_profile_discord_id, NULL)
    RETURNING id INTO v_coach_id;
  ELSE
    -- Update existing coach entry with latest Discord info
    UPDATE public.coaches
    SET display_name = v_profile_display_name,
        discord_id = v_profile_discord_id
    WHERE id = v_coach_id;
  END IF;
  
  -- Assign to team
  IF p_team_id IS NOT NULL THEN
    -- Check if team exists and is available
    SELECT id INTO v_team_id
    FROM public.teams
    WHERE id = p_team_id;
    
    IF v_team_id IS NULL THEN
      RAISE EXCEPTION 'Team not found: %', p_team_id;
    END IF;
    
    -- Update team coach_id (only if not already assigned)
    UPDATE public.teams
    SET coach_id = v_coach_id
    WHERE id = v_team_id AND (coach_id IS NULL OR coach_id = v_coach_id);
    
    IF NOT FOUND THEN
      RAISE EXCEPTION 'Team % is already assigned to another coach', p_team_id;
    END IF;
  ELSE
    -- Find unassigned team for current season
    SELECT t.id INTO v_team_id
    FROM public.teams t
    INNER JOIN public.seasons s ON t.season_id = s.id
    WHERE t.coach_id IS NULL
      AND s.is_current = true
    LIMIT 1;
    
    IF v_team_id IS NULL THEN
      RAISE EXCEPTION 'No unassigned teams available for current season. Please contact admin.';
    END IF;
    
    UPDATE public.teams
    SET coach_id = v_coach_id
    WHERE id = v_team_id;
  END IF;
  
  -- Update profile team_id
  UPDATE public.profiles
  SET team_id = v_team_id
  WHERE id = p_user_id;
  
  RETURN v_coach_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update comment
COMMENT ON FUNCTION public.assign_coach_to_team IS 'Assigns a user (coach) to a team. Creates coach entry if needed. Uses Discord credentials instead of email. If no team_id provided, assigns to first available team in current season.';
