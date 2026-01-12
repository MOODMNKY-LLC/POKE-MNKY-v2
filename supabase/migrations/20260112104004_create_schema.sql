-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Teams table
CREATE TABLE IF NOT EXISTS public.teams (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL UNIQUE,
  coach_name TEXT NOT NULL,
  division TEXT NOT NULL,
  conference TEXT NOT NULL,
  wins INTEGER DEFAULT 0,
  losses INTEGER DEFAULT 0,
  differential INTEGER DEFAULT 0,
  strength_of_schedule DECIMAL(4,3) DEFAULT 0,
  logo_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Pokemon table
CREATE TABLE IF NOT EXISTS public.pokemon (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  type1 TEXT,
  type2 TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Team Rosters (draft picks)
CREATE TABLE IF NOT EXISTS public.team_rosters (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  team_id UUID NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  pokemon_id UUID NOT NULL REFERENCES public.pokemon(id) ON DELETE CASCADE,
  draft_round INTEGER NOT NULL,
  draft_order INTEGER NOT NULL,
  draft_points INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(team_id, pokemon_id)
);

-- Matches table
CREATE TABLE IF NOT EXISTS public.matches (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  week INTEGER NOT NULL,
  team1_id UUID NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  team2_id UUID NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  winner_id UUID REFERENCES public.teams(id) ON DELETE SET NULL,
  team1_score INTEGER DEFAULT 0,
  team2_score INTEGER DEFAULT 0,
  differential INTEGER DEFAULT 0,
  is_playoff BOOLEAN DEFAULT FALSE,
  playoff_round TEXT,
  played_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Pokemon Stats (kills per match)
CREATE TABLE IF NOT EXISTS public.pokemon_stats (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  match_id UUID NOT NULL REFERENCES public.matches(id) ON DELETE CASCADE,
  pokemon_id UUID NOT NULL REFERENCES public.pokemon(id) ON DELETE CASCADE,
  team_id UUID NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  kills INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Sync log table to track Google Sheets imports
CREATE TABLE IF NOT EXISTS public.sync_log (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  sync_type TEXT NOT NULL,
  status TEXT NOT NULL,
  records_processed INTEGER DEFAULT 0,
  error_message TEXT,
  synced_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_teams_division ON public.teams(division);
CREATE INDEX IF NOT EXISTS idx_teams_conference ON public.teams(conference);
CREATE INDEX IF NOT EXISTS idx_team_rosters_team ON public.team_rosters(team_id);
CREATE INDEX IF NOT EXISTS idx_team_rosters_pokemon ON public.team_rosters(pokemon_id);
CREATE INDEX IF NOT EXISTS idx_matches_week ON public.matches(week);
CREATE INDEX IF NOT EXISTS idx_matches_playoff ON public.matches(is_playoff);
-- Conditional indexes for pokemon_stats (only if match_id column exists)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'pokemon_stats' AND column_name = 'match_id'
  ) THEN
    CREATE INDEX IF NOT EXISTS idx_pokemon_stats_match ON public.pokemon_stats(match_id);
  END IF;
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'pokemon_stats' AND column_name = 'pokemon_id'
  ) THEN
    CREATE INDEX IF NOT EXISTS idx_pokemon_stats_pokemon ON public.pokemon_stats(pokemon_id);
  END IF;
END $$;

-- Enable Row Level Security
ALTER TABLE public.teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pokemon ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.team_rosters ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pokemon_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sync_log ENABLE ROW LEVEL SECURITY;

-- Public read access for all tables (everyone can view)
CREATE POLICY "Allow public read access on teams" ON public.teams FOR SELECT USING (true);
CREATE POLICY "Allow public read access on pokemon" ON public.pokemon FOR SELECT USING (true);
CREATE POLICY "Allow public read access on team_rosters" ON public.team_rosters FOR SELECT USING (true);
CREATE POLICY "Allow public read access on matches" ON public.matches FOR SELECT USING (true);
CREATE POLICY "Allow public read access on pokemon_stats" ON public.pokemon_stats FOR SELECT USING (true);

-- Admin-only write access (will implement admin role later)
CREATE POLICY "Allow authenticated insert on teams" ON public.teams FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Allow authenticated update on teams" ON public.teams FOR UPDATE USING (auth.role() = 'authenticated');
CREATE POLICY "Allow authenticated insert on matches" ON public.matches FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Allow authenticated update on matches" ON public.matches FOR UPDATE USING (auth.role() = 'authenticated');
CREATE POLICY "Allow authenticated insert on pokemon_stats" ON public.pokemon_stats FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- Allow sync log writes for authenticated users
CREATE POLICY "Allow authenticated insert on sync_log" ON public.sync_log FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Allow public read on sync_log" ON public.sync_log FOR SELECT USING (true);
