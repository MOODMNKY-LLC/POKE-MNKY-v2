-- Create function to assign coach to team
-- Migration: 20260116000013_create_coach_assignment_function.sql

CREATE OR REPLACE FUNCTION public.assign_coach_to_team(
  p_user_id UUID,
  p_team_id UUID DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  v_coach_id UUID;
  v_team_id UUID;
  v_profile_display_name TEXT;
  v_profile_email TEXT;
BEGIN
  -- Get profile info
  SELECT display_name, email INTO v_profile_display_name, v_profile_email
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
    INSERT INTO public.coaches (user_id, display_name, email)
    VALUES (p_user_id, v_profile_display_name, v_profile_email)
    RETURNING id INTO v_coach_id;
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

-- Add comment
COMMENT ON FUNCTION public.assign_coach_to_team IS 'Assigns a user (coach) to a team. Creates coach entry if needed. If no team_id provided, assigns to first available team in current season.';

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.assign_coach_to_team(UUID, UUID) TO authenticated;
