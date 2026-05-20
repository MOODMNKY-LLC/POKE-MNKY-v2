-- Disallow random first-available team assignment when p_team_id is omitted.

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
  IF p_team_id IS NULL THEN
    RAISE EXCEPTION 'team_id is required. Auto-assign to the first open slot is disabled; pass an explicit league team id.';
  END IF;

  SELECT display_name, discord_id INTO v_profile_display_name, v_profile_discord_id
  FROM public.profiles
  WHERE id = p_user_id;

  IF v_profile_display_name IS NULL THEN
    RAISE EXCEPTION 'User profile not found for user_id: %', p_user_id;
  END IF;

  SELECT id INTO v_coach_id
  FROM public.coaches
  WHERE user_id = p_user_id;

  IF v_coach_id IS NULL THEN
    INSERT INTO public.coaches (user_id, display_name, discord_id, discord_user_id, email)
    VALUES (p_user_id, v_profile_display_name, v_profile_discord_id, v_profile_discord_id, NULL)
    RETURNING id INTO v_coach_id;
  ELSE
    UPDATE public.coaches
    SET display_name = v_profile_display_name,
        discord_id = v_profile_discord_id,
        discord_user_id = v_profile_discord_id
    WHERE id = v_coach_id;
  END IF;

  SELECT id INTO v_team_id
  FROM public.teams
  WHERE id = p_team_id;

  IF v_team_id IS NULL THEN
    RAISE EXCEPTION 'Team not found: %', p_team_id;
  END IF;

  UPDATE public.teams
  SET coach_id = v_coach_id
  WHERE id = v_team_id AND (coach_id IS NULL OR coach_id = v_coach_id);

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Team % is already assigned to another coach', p_team_id;
  END IF;

  UPDATE public.profiles
  SET team_id = v_team_id
  WHERE id = p_user_id;

  RETURN v_coach_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION public.assign_coach_to_team IS
  'Assigns a user (coach) to an explicit team. p_team_id is required; no auto-assign.';
