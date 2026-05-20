-- Release coach from league team (undo mistaken assign / claim).

CREATE OR REPLACE FUNCTION public.release_coach_from_team(
  p_user_id UUID,
  p_team_id UUID DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  v_coach_id UUID;
  v_team_id UUID;
BEGIN
  SELECT id INTO v_coach_id
  FROM public.coaches
  WHERE user_id = p_user_id;

  IF v_coach_id IS NULL THEN
    RAISE EXCEPTION 'No coach record for user_id: %', p_user_id;
  END IF;

  IF p_team_id IS NOT NULL THEN
    v_team_id := p_team_id;
  ELSE
    SELECT team_id INTO v_team_id
    FROM public.profiles
    WHERE id = p_user_id;
  END IF;

  IF v_team_id IS NULL THEN
    SELECT t.id INTO v_team_id
    FROM public.teams t
    INNER JOIN public.seasons s ON t.season_id = s.id
    WHERE t.coach_id = v_coach_id
      AND s.is_current = true
    LIMIT 1;
  END IF;

  IF v_team_id IS NULL THEN
    RAISE EXCEPTION 'No team assignment found to release for user_id: %', p_user_id;
  END IF;

  UPDATE public.teams
  SET coach_id = NULL
  WHERE id = v_team_id AND coach_id = v_coach_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Team % is not assigned to this coach', v_team_id;
  END IF;

  UPDATE public.profiles
  SET team_id = NULL
  WHERE id = p_user_id AND team_id = v_team_id;

  RETURN v_team_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION public.release_coach_from_team IS
  'Clears teams.coach_id and profiles.team_id for a coach. Optional p_team_id; else uses profile.team_id or current-season team.';

GRANT EXECUTE ON FUNCTION public.release_coach_from_team(UUID, UUID) TO authenticated;
