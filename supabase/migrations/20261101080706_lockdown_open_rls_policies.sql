-- Security lockdown 3/3: open RLS write policies
--
-- A) 10 write policies open to PUBLIC (anon included) with true. Nothing in the app writes these
--    tables with the anon or user key (Showdown replay/teambuilder tables, team metadata, audit log,
--    video views), so write access goes back to service_role only (it bypasses RLS). Read access
--    that the ALL policies used to grant is kept as explicit SELECT policies so reads do not change.
-- B) 6 authenticated UPDATE policies had WITH CHECK (true), which let an allowed updater rewrite a
--    row into any state (e.g. move it to another team). WITH CHECK now matches USING.

-- A) public `true` writes
DROP POLICY IF EXISTS "Allow insert replayplayers" ON public.replayplayers;
DROP POLICY IF EXISTS "Allow insert replays" ON public.replays;
DROP POLICY IF EXISTS "Allow update replays" ON public.replays;

DROP POLICY IF EXISTS "Allow all client team operations" ON public.showdown_client_teams;
CREATE POLICY "Read client teams" ON public.showdown_client_teams FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "Allow all category operations" ON public.team_categories;
CREATE POLICY "Read team categories" ON public.team_categories FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "Allow all format operations" ON public.team_formats;
CREATE POLICY "Read team formats" ON public.team_formats FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "Allow all tag assignment operations" ON public.team_tag_assignments;
CREATE POLICY "Read team tag assignments" ON public.team_tag_assignments FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "Allow all tag operations" ON public.team_tags;
CREATE POLICY "Read team tags" ON public.team_tags FOR SELECT TO anon, authenticated USING (true);

-- transaction_audit is only written by server code (service_role).
DROP POLICY IF EXISTS "insert transaction_audit" ON public.transaction_audit;

-- video_views has a user_id column: signed-in users may log their own views only.
DROP POLICY IF EXISTS "Anyone can create video views" ON public.video_views;
CREATE POLICY "Users can log own video views" ON public.video_views FOR INSERT TO authenticated
  WITH CHECK (user_id = (SELECT auth.uid()));

-- B) authenticated UPDATE ... WITH CHECK (true) -> same as USING
ALTER POLICY league_trade_offers_update_receiving_or_commissioner ON public.league_trade_offers
  WITH CHECK ((EXISTS ( SELECT 1 FROM (teams t JOIN coaches c ON ((c.id = t.coach_id))) WHERE ((c.user_id = auth.uid()) AND (t.id = league_trade_offers.receiving_team_id)))) OR (EXISTS ( SELECT 1 FROM profiles p WHERE ((p.id = auth.uid()) AND ((p.role = 'admin'::text) OR (p.role = 'commissioner'::text))))));

ALTER POLICY pending_transactions_update_service_or_league ON public.pending_transactions
  WITH CHECK ((EXISTS ( SELECT 1 FROM profiles p WHERE ((p.id = auth.uid()) AND ((p.role = 'admin'::text) OR (p.role = 'commissioner'::text))))) OR (auth.role() = 'service_role'::text));

ALTER POLICY season_draft_pool_update_admin ON public.season_draft_pool
  WITH CHECK (EXISTS ( SELECT 1 FROM profiles p WHERE ((p.id = auth.uid()) AND ((p.role = 'admin'::text) OR (p.role = 'commissioner'::text)))));

ALTER POLICY season_rules_update_admin ON public.season_rules
  WITH CHECK (EXISTS ( SELECT 1 FROM profiles p WHERE ((p.id = auth.uid()) AND ((p.role = 'admin'::text) OR (p.role = 'commissioner'::text)))));

ALTER POLICY tera_assignment_windows_update_own ON public.tera_assignment_windows
  WITH CHECK (EXISTS ( SELECT 1 FROM (teams t JOIN coaches c ON ((c.id = t.coach_id))) WHERE ((c.user_id = auth.uid()) AND (t.id = tera_assignment_windows.receiving_team_id))));

ALTER POLICY trade_block_entries_update_own ON public.trade_block_entries
  WITH CHECK (EXISTS ( SELECT 1 FROM (teams t JOIN coaches c ON ((c.id = t.coach_id))) WHERE ((c.user_id = auth.uid()) AND (t.id = trade_block_entries.team_id))));
