-- Allow public read access to draft_sessions
-- Draft sessions should be viewable by everyone (they're public information)
-- Only authenticated users can make picks, but anyone can view the draft status

-- Drop existing authenticated-only policy
DROP POLICY IF EXISTS "Draft sessions are viewable by authenticated users" ON public.draft_sessions;

-- Create public read policy
CREATE POLICY "Draft sessions are viewable by everyone"
  ON public.draft_sessions
  FOR SELECT
  USING (true);
