-- Enhanced schema for comprehensive league operations
-- Adds: Seasons, Conferences, Divisions, Coaches, Draft budgets, Battle sessions, Trades, Streaks

-- Seasons table
CREATE TABLE IF NOT EXISTS public.seasons (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL UNIQUE,
  start_date DATE NOT NULL,
  end_date DATE,
  is_current BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Conferences table
CREATE TABLE IF NOT EXISTS public.conferences (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL UNIQUE,
  season_id UUID NOT NULL REFERENCES public.seasons(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Divisions table
CREATE TABLE IF NOT EXISTS public.divisions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  conference_id UUID NOT NULL REFERENCES public.conferences(id) ON DELETE CASCADE,
  season_id UUID NOT NULL REFERENCES public.seasons(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(name, conference_id)
);

-- Coaches table (linked to Discord users)
CREATE TABLE IF NOT EXISTS public.coaches (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  discord_id TEXT UNIQUE,
  display_name TEXT NOT NULL,
  email TEXT,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Update teams table to reference new structure
ALTER TABLE public.teams ADD COLUMN IF NOT EXISTS season_id UUID REFERENCES public.seasons(id) ON DELETE CASCADE;
ALTER TABLE public.teams ADD COLUMN IF NOT EXISTS division_id UUID REFERENCES public.divisions(id) ON DELETE SET NULL;
ALTER TABLE public.teams ADD COLUMN IF NOT EXISTS coach_id UUID REFERENCES public.coaches(id) ON DELETE SET NULL;
ALTER TABLE public.teams ADD COLUMN IF NOT EXISTS current_streak INTEGER DEFAULT 0;
ALTER TABLE public.teams ADD COLUMN IF NOT EXISTS streak_type TEXT CHECK (streak_type IN ('W', 'L'));

-- Pokemon cache (from PokéAPI / Pokenode-TS)
CREATE TABLE IF NOT EXISTS public.pokemon_cache (
  pokemon_id INTEGER PRIMARY KEY,
  name TEXT NOT NULL,
  types TEXT[] NOT NULL,
  base_stats JSONB NOT NULL, -- {hp, attack, defense, sp_attack, sp_defense, speed}
  abilities TEXT[] NOT NULL,
  moves TEXT[] NOT NULL,
  sprite_url TEXT,
  draft_cost INTEGER DEFAULT 10, -- Point cost for draft budget system
  tier TEXT, -- OU, UU, RU, etc.
  payload JSONB NOT NULL, -- Full PokéAPI response
  fetched_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ DEFAULT NOW() + INTERVAL '30 days'
);

-- Draft budgets
CREATE TABLE IF NOT EXISTS public.draft_budgets (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  team_id UUID NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  season_id UUID NOT NULL REFERENCES public.seasons(id) ON DELETE CASCADE,
  total_points INTEGER DEFAULT 120,
  spent_points INTEGER DEFAULT 0,
  remaining_points INTEGER GENERATED ALWAYS AS (total_points - spent_points) STORED,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(team_id, season_id)
);

-- Matchweeks
CREATE TABLE IF NOT EXISTS public.matchweeks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  season_id UUID NOT NULL REFERENCES public.seasons(id) ON DELETE CASCADE,
  week_number INTEGER NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  is_playoff BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(season_id, week_number)
);

-- Enhanced matches with scheduling
ALTER TABLE public.matches ADD COLUMN IF NOT EXISTS matchweek_id UUID REFERENCES public.matchweeks(id) ON DELETE CASCADE;
ALTER TABLE public.matches ADD COLUMN IF NOT EXISTS season_id UUID REFERENCES public.seasons(id) ON DELETE CASCADE;
ALTER TABLE public.matches ADD COLUMN IF NOT EXISTS scheduled_time TIMESTAMPTZ;
ALTER TABLE public.matches ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'in_progress', 'completed', 'disputed', 'cancelled'));
ALTER TABLE public.matches ADD COLUMN IF NOT EXISTS replay_url TEXT;
ALTER TABLE public.matches ADD COLUMN IF NOT EXISTS submitted_by UUID REFERENCES public.coaches(id);
ALTER TABLE public.matches ADD COLUMN IF NOT EXISTS approved_by UUID REFERENCES public.coaches(id);
ALTER TABLE public.matches ADD COLUMN IF NOT EXISTS notes TEXT;

-- Battle sessions (for Showdown-style battles)
CREATE TABLE IF NOT EXISTS public.battle_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  match_id UUID REFERENCES public.matches(id) ON DELETE CASCADE,
  format TEXT NOT NULL, -- gen9-ou, gen8-uu, etc.
  team_a_id UUID NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  team_b_id UUID NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  state JSONB, -- Current battle state
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'complete', 'aborted')),
  winner_id UUID REFERENCES public.teams(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Battle events (turn-by-turn log)
CREATE TABLE IF NOT EXISTS public.battle_events (
  id BIGSERIAL PRIMARY KEY,
  battle_id UUID NOT NULL REFERENCES public.battle_sessions(id) ON DELETE CASCADE,
  turn INTEGER NOT NULL,
  event_type TEXT NOT NULL, -- action, result, commentary, system
  payload JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Trade system
CREATE TABLE IF NOT EXISTS public.trade_listings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  team_id UUID NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  pokemon_id INTEGER NOT NULL,
  status TEXT DEFAULT 'available' CHECK (status IN ('available', 'pending', 'completed', 'cancelled')),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.trade_offers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  listing_id UUID NOT NULL REFERENCES public.trade_listings(id) ON DELETE CASCADE,
  offering_team_id UUID NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  offered_pokemon_id INTEGER NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected', 'cancelled')),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.trade_transactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  season_id UUID NOT NULL REFERENCES public.seasons(id) ON DELETE CASCADE,
  team_a_id UUID NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  team_b_id UUID NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  team_a_pokemon_id INTEGER NOT NULL,
  team_b_pokemon_id INTEGER NOT NULL,
  approved_by UUID REFERENCES public.coaches(id),
  completed_at TIMESTAMPTZ DEFAULT NOW()
);

-- Discord webhooks config
CREATE TABLE IF NOT EXISTS public.discord_webhooks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL UNIQUE,
  webhook_url TEXT NOT NULL,
  enabled BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for new tables
CREATE INDEX IF NOT EXISTS idx_coaches_discord ON public.coaches(discord_id);
CREATE INDEX IF NOT EXISTS idx_pokemon_cache_tier ON public.pokemon_cache(tier);
CREATE INDEX IF NOT EXISTS idx_pokemon_cache_cost ON public.pokemon_cache(draft_cost);
CREATE INDEX IF NOT EXISTS idx_battle_sessions_match ON public.battle_sessions(match_id);
CREATE INDEX IF NOT EXISTS idx_battle_events_battle ON public.battle_events(battle_id);
CREATE INDEX IF NOT EXISTS idx_trade_listings_team ON public.trade_listings(team_id);
CREATE INDEX IF NOT EXISTS idx_matchweeks_season ON public.matchweeks(season_id);

-- RLS policies for new tables
ALTER TABLE public.seasons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.divisions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.coaches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pokemon_cache ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.draft_budgets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.matchweeks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.battle_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.battle_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trade_listings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trade_offers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trade_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.discord_webhooks ENABLE ROW LEVEL SECURITY;

-- Public read policies
CREATE POLICY "Public read seasons" ON public.seasons FOR SELECT USING (true);
CREATE POLICY "Public read conferences" ON public.conferences FOR SELECT USING (true);
CREATE POLICY "Public read divisions" ON public.divisions FOR SELECT USING (true);
CREATE POLICY "Public read coaches" ON public.coaches FOR SELECT USING (true);
CREATE POLICY "Public read pokemon_cache" ON public.pokemon_cache FOR SELECT USING (true);
CREATE POLICY "Public read draft_budgets" ON public.draft_budgets FOR SELECT USING (true);
CREATE POLICY "Public read matchweeks" ON public.matchweeks FOR SELECT USING (true);
CREATE POLICY "Public read battle_sessions" ON public.battle_sessions FOR SELECT USING (true);
CREATE POLICY "Public read battle_events" ON public.battle_events FOR SELECT USING (true);
CREATE POLICY "Public read trade_listings" ON public.trade_listings FOR SELECT USING (true);
CREATE POLICY "Public read trade_offers" ON public.trade_offers FOR SELECT USING (true);
CREATE POLICY "Public read trade_transactions" ON public.trade_transactions FOR SELECT USING (true);

-- Admin write policies
CREATE POLICY "Authenticated insert seasons" ON public.seasons FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Authenticated insert coaches" ON public.coaches FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Authenticated insert pokemon_cache" ON public.pokemon_cache FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Authenticated update pokemon_cache" ON public.pokemon_cache FOR UPDATE USING (auth.role() = 'authenticated');
CREATE POLICY "Authenticated insert battle_sessions" ON public.battle_sessions FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Authenticated update battle_sessions" ON public.battle_sessions FOR UPDATE USING (auth.role() = 'authenticated');
CREATE POLICY "Authenticated insert battle_events" ON public.battle_events FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- Coach-owned policies (coaches can manage their own trades)
CREATE POLICY "Coaches manage own trade_listings" ON public.trade_listings 
  FOR ALL USING (auth.uid() IN (SELECT user_id FROM coaches WHERE id IN (SELECT coach_id FROM teams WHERE id = team_id)));

CREATE POLICY "Coaches create trade_offers" ON public.trade_offers 
  FOR INSERT WITH CHECK (auth.uid() IN (SELECT user_id FROM coaches WHERE id IN (SELECT coach_id FROM teams WHERE id = offering_team_id)));
