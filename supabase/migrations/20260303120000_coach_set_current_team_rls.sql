-- RLS: Coaches can update their own profile.team_id only to a team they coach.
-- Allows "Set current team" on dashboard without letting coaches set arbitrary team_id.

DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;

CREATE POLICY "Users can update own profile"
  ON public.profiles
  FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (
    auth.uid() = id
    AND (
      -- Non-coaches can update any of their own fields
      (SELECT role FROM public.profiles WHERE id = auth.uid()) <> 'coach'
      OR
      -- Coaches: team_id must be NULL or a team they coach
      (
        team_id IS NULL
        OR EXISTS (
          SELECT 1
          FROM public.coaches c
          JOIN public.teams t ON t.coach_id = c.id
          WHERE c.user_id = auth.uid()
            AND t.id = team_id
        )
      )
    )
  );

COMMENT ON POLICY "Users can update own profile" ON public.profiles IS
  'Users can update own profile; coaches may set team_id only to a team they coach (for Set current team).';
