# Next Steps: In-App Showdown Integration

**Date**: January 2026  
**Status**: Showdown Server Setup Complete ✅  
**Focus**: Building In-App Integration Components

---

## Current State Assessment

### ✅ What's Already Done
- Showdown server deployed and accessible
- Basic `/showdown` page exists (placeholder)
- Battle engine foundation (`lib/battle-engine.ts`)
- Match management system (`app/matches/`)
- Team builder (`app/teams/builder/`)
- Database schema with `matches`, `battle_sessions`, `team_rosters` tables

### ❌ What's Missing (In-App)
- API endpoints for Showdown room creation
- Team parsing/validation module (koffingjs)
- Showdown page functionality (currently just placeholder)
- Match lobby component
- Team builder Showdown export/import
- Replay library component
- Database columns for Showdown room tracking

---

## Prioritized Implementation Plan

### 🎯 Phase 1: Foundation APIs (Week 1) - HIGH PRIORITY

**Goal**: Create the backend infrastructure to connect your app to Showdown server.

#### Step 1.1: Database Migration for Showdown Fields

**Create**: `supabase/migrations/YYYYMMDDHHMMSS_add_showdown_fields.sql`

```sql
-- Add Showdown room tracking to matches table
ALTER TABLE public.matches
  ADD COLUMN IF NOT EXISTS showdown_room_id TEXT,
  ADD COLUMN IF NOT EXISTS showdown_room_url TEXT;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_matches_showdown_room_id ON public.matches(showdown_room_id);

-- Add comment for documentation
COMMENT ON COLUMN public.matches.showdown_room_id IS 'Showdown room identifier for battle tracking';
COMMENT ON COLUMN public.matches.showdown_room_url IS 'Full URL to join Showdown battle room';
```

**Action**: Run this migration in Supabase SQL Editor.

#### Step 1.2: Environment Variables Setup

**Add to `.env.local`**:
```env
# Showdown Server Configuration
SHOWDOWN_SERVER_URL=http://your-showdown-server-url:8000
SHOWDOWN_API_KEY=your-api-key-if-needed
NEXT_PUBLIC_SHOWDOWN_CLIENT_URL=http://your-showdown-client-url
```

**Action**: Add these variables to your environment files.

#### Step 1.3: Create Showdown API Endpoints

**Create**: `app/api/showdown/create-room/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';
import { createClient } from '@/lib/supabase/service';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { match_id } = await request.json();

    if (!match_id) {
      return NextResponse.json({ error: 'match_id is required' }, { status: 400 });
    }

    // Get match details
    const serviceSupabase = createClient();
    const { data: match, error: matchError } = await serviceSupabase
      .from('matches')
      .select(`
        *,
        team1:teams!matches_team1_id_fkey(id, name),
        team2:teams!matches_team2_id_fkey(id, name)
      `)
      .eq('id', match_id)
      .single();

    if (matchError || !match) {
      return NextResponse.json({ error: 'Match not found' }, { status: 404 });
    }

    // Check if user is part of this match
    const userTeam = await serviceSupabase
      .from('teams')
      .select('id')
      .eq('coach_id', user.id)
      .in('id', [match.team1_id, match.team2_id])
      .single();

    if (!userTeam.data) {
      return NextResponse.json({ error: 'You are not part of this match' }, { status: 403 });
    }

    // Generate room identifier (format: battle-match-{match_id})
    const roomId = `battle-match-${match_id}`;
    const roomUrl = `${process.env.NEXT_PUBLIC_SHOWDOWN_CLIENT_URL}/battle-${roomId}`;

    // Call Showdown server API to create room
    // Note: Adjust this based on your Showdown server's API
    const showdownResponse = await fetch(`${process.env.SHOWDOWN_SERVER_URL}/api/create-room`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(process.env.SHOWDOWN_API_KEY && {
          'Authorization': `Bearer ${process.env.SHOWDOWN_API_KEY}`
        })
      },
      body: JSON.stringify({
        roomId,
        format: 'gen9avgatbest', // Your league format
        team1: match.team1.name,
        team2: match.team2.name
      })
    });

    if (!showdownResponse.ok) {
      const error = await showdownResponse.text();
      return NextResponse.json(
        { error: `Failed to create Showdown room: ${error}` },
        { status: 500 }
      );
    }

    const { room_id, room_url } = await showdownResponse.json();

    // Update match record
    const { error: updateError } = await serviceSupabase
      .from('matches')
      .update({
        showdown_room_id: room_id || roomId,
        showdown_room_url: room_url || roomUrl,
        status: 'in_progress'
      })
      .eq('id', match_id);

    if (updateError) {
      return NextResponse.json(
        { error: `Failed to update match: ${updateError.message}` },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      room_id: room_id || roomId,
      room_url: room_url || roomUrl,
      match_id
    });
  } catch (error) {
    console.error('[Showdown] Create room error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
```

**Action**: Create this file and test with a match ID.

#### Step 1.4: Team Validation API Endpoint

**Create**: `app/api/showdown/validate-team/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';
import { createClient } from '@/lib/supabase/service';
import { parseShowdownTeam, validateTeamAgainstRoster } from '@/lib/team-parser';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { team_text, match_id } = await request.json();

    if (!team_text) {
      return NextResponse.json({ error: 'team_text is required' }, { status: 400 });
    }

    // Parse team
    const parsed = await parseShowdownTeam(team_text);

    if (parsed.errors.length > 0) {
      return NextResponse.json({
        valid: false,
        errors: parsed.errors,
        message: 'Failed to parse team'
      }, { status: 400 });
    }

    // Get user's team
    const serviceSupabase = createClient();
    const { data: userTeam } = await serviceSupabase
      .from('teams')
      .select('id, season_id')
      .eq('coach_id', user.id)
      .single();

    if (!userTeam) {
      return NextResponse.json({ error: 'Team not found' }, { status: 404 });
    }

    // Get drafted roster
    const { data: roster } = await serviceSupabase
      .from('team_rosters')
      .select('pokemon_id, pokemon_name')
      .eq('team_id', userTeam.id)
      .eq('season_id', userTeam.season_id);

    if (!roster || roster.length === 0) {
      return NextResponse.json({
        valid: false,
        errors: ['No drafted roster found'],
        message: 'You need to draft Pokemon first'
      }, { status: 400 });
    }

    // Validate team against roster
    const validation = await validateTeamAgainstRoster(
      parsed,
      roster.map(r => ({
        pokemon_id: r.pokemon_id,
        pokemon_name: r.pokemon_name
      })),
      {} // League rules - implement based on your league_config table
    );

    return NextResponse.json({
      valid: validation.valid,
      errors: validation.errors,
      team: parsed,
      canonical_text: parsed.canonicalText
    });
  } catch (error) {
    console.error('[Showdown] Validate team error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
```

**Action**: Create this file (will need team parser module first - see Step 2.1).

---

### 🎯 Phase 2: Team Parser Module (Week 1) - HIGH PRIORITY

**Goal**: Enable parsing and validation of Showdown team exports.

#### Step 2.1: Install koffingjs

**Action**: Run in terminal
```bash
pnpm add koffingjs
```

#### Step 2.2: Create Team Parser Module

**Create**: `lib/team-parser.ts`

```typescript
import { parseTeam, exportTeam } from 'koffingjs';

export interface ParsedPokemon {
  name: string;
  item?: string;
  ability?: string;
  moves: string[];
  nature?: string;
  evs?: Record<string, number>;
  ivs?: Record<string, number>;
  teraType?: string;
  level?: number;
}

export interface ParsedTeam {
  pokemon: ParsedPokemon[];
  errors: string[];
  canonicalText: string;
}

export interface RosterEntry {
  pokemon_id: number;
  pokemon_name: string;
}

export interface LeagueRules {
  bannedItems?: string[];
  bannedMoves?: string[];
  bannedAbilities?: string[];
  maxLevel?: number;
  teraRules?: any;
}

export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

/**
 * Parse a Showdown team export text into structured data
 */
export async function parseShowdownTeam(teamText: string): Promise<ParsedTeam> {
  try {
    // Clean up the team text
    const cleaned = teamText.trim();
    
    if (!cleaned) {
      return {
        pokemon: [],
        errors: ['Empty team text'],
        canonicalText: ''
      };
    }

    // Parse using koffingjs
    const parsed = parseTeam(cleaned);
    
    // Generate canonical export
    const canonical = exportTeam(parsed);

    // Transform to our format
    const pokemon: ParsedPokemon[] = parsed.team.map((p: any) => ({
      name: p.name || p.species || '',
      item: p.item,
      ability: p.ability,
      moves: p.moves || [],
      nature: p.nature,
      evs: p.evs,
      ivs: p.ivs,
      teraType: p.teraType,
      level: p.level || 50
    }));

    return {
      pokemon,
      errors: [],
      canonicalText: canonical
    };
  } catch (error) {
    return {
      pokemon: [],
      errors: [error instanceof Error ? error.message : 'Failed to parse team'],
      canonicalText: teamText
    };
  }
}

/**
 * Validate a parsed team against the user's drafted roster
 */
export async function validateTeamAgainstRoster(
  team: ParsedTeam,
  roster: RosterEntry[],
  leagueRules: LeagueRules = {}
): Promise<ValidationResult> {
  const errors: string[] = [];

  // Check each Pokemon is in roster
  for (const pokemon of team.pokemon) {
    const pokemonName = pokemon.name.toLowerCase().trim();
    
    const inRoster = roster.some(r => {
      const rosterName = r.pokemon_name.toLowerCase().trim();
      // Check exact match or if name contains the roster name
      return rosterName === pokemonName || 
             pokemonName.includes(rosterName) || 
             rosterName.includes(pokemonName);
    });

    if (!inRoster) {
      errors.push(`${pokemon.name} is not on your drafted roster`);
    }
  }

  // Check team size (6-10 Pokemon for draft league)
  if (team.pokemon.length < 6) {
    errors.push(`Team must have at least 6 Pokemon (you have ${team.pokemon.length})`);
  }
  if (team.pokemon.length > 10) {
    errors.push(`Team cannot have more than 10 Pokemon (you have ${team.pokemon.length})`);
  }

  // Check league rules
  if (leagueRules.bannedItems) {
    for (const pokemon of team.pokemon) {
      if (pokemon.item && leagueRules.bannedItems!.includes(pokemon.item)) {
        errors.push(`${pokemon.name} has banned item: ${pokemon.item}`);
      }
    }
  }

  if (leagueRules.bannedMoves) {
    for (const pokemon of team.pokemon) {
      for (const move of pokemon.moves) {
        if (leagueRules.bannedMoves!.includes(move)) {
          errors.push(`${pokemon.name} has banned move: ${move}`);
        }
      }
    }
  }

  if (leagueRules.maxLevel) {
    for (const pokemon of team.pokemon) {
      if (pokemon.level && pokemon.level > leagueRules.maxLevel!) {
        errors.push(`${pokemon.name} exceeds level cap: ${pokemon.level} > ${leagueRules.maxLevel}`);
      }
    }
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Export a team to Showdown format
 */
export function exportTeamToShowdown(team: ParsedTeam): string {
  return team.canonicalText;
}
```

**Action**: Create this file and test with sample Showdown team exports.

---

### 🎯 Phase 3: Showdown Page Components (Week 2) - MEDIUM PRIORITY

**Goal**: Transform the placeholder Showdown page into functional components.

#### Step 3.1: Create Match Lobby Component

**Create**: `components/showdown/match-lobby.tsx`

```typescript
'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ExternalLink, Play, Clock } from 'lucide-react';
import { useRouter } from 'next/navigation';

interface Match {
  id: string;
  week: number;
  team1_name: string;
  team2_name: string;
  status: string;
  showdown_room_url?: string;
  showdown_room_id?: string;
  deadline?: string;
}

export default function MatchLobby() {
  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    fetchMatches();
  }, []);

  const fetchMatches = async () => {
    try {
      const response = await fetch('/api/matches?status=scheduled,in_progress');
      const data = await response.json();
      setMatches(data || []);
    } catch (error) {
      console.error('Failed to fetch matches:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleLaunchBattle = async (matchId: string) => {
    setCreating(matchId);
    try {
      const response = await fetch('/api/showdown/create-room', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ match_id: matchId })
      });

      const result = await response.json();

      if (result.success && result.room_url) {
        // Open Showdown room in new tab
        window.open(result.room_url, '_blank');
        // Refresh matches to show updated status
        fetchMatches();
      } else {
        alert(`Failed to create battle room: ${result.error || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Failed to launch battle:', error);
      alert('Failed to launch battle. Please try again.');
    } finally {
      setCreating(null);
    }
  };

  if (loading) {
    return <div className="text-center py-8">Loading matches...</div>;
  }

  if (matches.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        No upcoming matches found
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold mb-4">Upcoming Matches</h2>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {matches.map(match => (
          <Card key={match.id}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">Week {match.week}</CardTitle>
                <Badge variant={match.status === 'in_progress' ? 'default' : 'secondary'}>
                  {match.status}
                </Badge>
              </div>
              <CardDescription>
                {match.team1_name} vs {match.team2_name}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {match.deadline && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Clock className="h-4 w-4" />
                  <span>Deadline: {new Date(match.deadline).toLocaleDateString()}</span>
                </div>
              )}
              
              {match.showdown_room_url ? (
                <Button
                  onClick={() => window.open(match.showdown_room_url, '_blank')}
                  className="w-full"
                  variant="default"
                >
                  <ExternalLink className="h-4 w-4 mr-2" />
                  Join Battle Room
                </Button>
              ) : (
                <Button
                  onClick={() => handleLaunchBattle(match.id)}
                  className="w-full"
                  disabled={creating === match.id}
                >
                  {creating === match.id ? (
                    <>Creating...</>
                  ) : (
                    <>
                      <Play className="h-4 w-4 mr-2" />
                      Launch Battle
                    </>
                  )}
                </Button>
              )}
              
              <Button
                variant="outline"
                className="w-full"
                onClick={() => router.push(`/matches/${match.id}`)}
              >
                View Match Details
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
```

**Action**: Create this component.

#### Step 3.2: Update Showdown Page

**Update**: `app/showdown/page.tsx`

Replace the placeholder content with:

```typescript
'use client';

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import MatchLobby from '@/components/showdown/match-lobby';
import TeamBuilder from '@/components/showdown/team-builder';
import ReplayLibrary from '@/components/showdown/replay-library';

export default function ShowdownPage() {
  return (
    <div className="container mx-auto py-8 px-4 max-w-6xl">
      <div className="mb-8">
        <h1 className="text-4xl font-bold mb-2">Battle Simulator</h1>
        <p className="text-muted-foreground">
          Launch battles, validate teams, and review replays from your league matches
        </p>
      </div>

      <Tabs defaultValue="lobby" className="w-full">
        <TabsList>
          <TabsTrigger value="lobby">Match Lobby</TabsTrigger>
          <TabsTrigger value="builder">Team Validator</TabsTrigger>
          <TabsTrigger value="replays">Replay Library</TabsTrigger>
        </TabsList>

        <TabsContent value="lobby" className="mt-6">
          <MatchLobby />
        </TabsContent>

        <TabsContent value="builder" className="mt-6">
          <TeamBuilder />
        </TabsContent>

        <TabsContent value="replays" className="mt-6">
          <ReplayLibrary />
        </TabsContent>
      </Tabs>
    </div>
  );
}
```

**Action**: Update the showdown page file.

---

### 🎯 Phase 4: Team Builder Integration (Week 2) - MEDIUM PRIORITY

**Goal**: Add Showdown export/import to existing team builder.

#### Step 4.1: Create Team Validator Component

**Create**: `components/showdown/team-builder.tsx`

```typescript
'use client';

import { useState } from 'react';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { CheckCircle2, XCircle, Copy } from 'lucide-react';

export default function TeamBuilder() {
  const [teamText, setTeamText] = useState('');
  const [validation, setValidation] = useState<{
    valid: boolean;
    errors: string[];
    canonicalText?: string;
  } | null>(null);
  const [validating, setValidating] = useState(false);

  const handleValidate = async () => {
    if (!teamText.trim()) {
      alert('Please paste a team first');
      return;
    }

    setValidating(true);
    try {
      const response = await fetch('/api/showdown/validate-team', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ team_text: teamText })
      });

      const result = await response.json();
      setValidation(result);
    } catch (error) {
      console.error('Validation error:', error);
      alert('Failed to validate team. Please try again.');
    } finally {
      setValidating(false);
    }
  };

  const handleCopyCanonical = () => {
    if (validation?.canonical_text) {
      navigator.clipboard.writeText(validation.canonical_text);
      alert('Team copied to clipboard!');
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Team Validator</CardTitle>
          <CardDescription>
            Paste your Showdown team export to validate it against your drafted roster and league rules
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="text-sm font-medium mb-2 block">
              Paste Showdown Team Export
            </label>
            <Textarea
              value={teamText}
              onChange={(e) => setTeamText(e.target.value)}
              placeholder="Paste your team here..."
              className="font-mono text-sm min-h-[200px]"
            />
          </div>

          <Button onClick={handleValidate} disabled={validating || !teamText.trim()}>
            {validating ? 'Validating...' : 'Validate Team'}
          </Button>

          {validation && (
            <Alert variant={validation.valid ? 'default' : 'destructive'}>
              <div className="flex items-start gap-2">
                {validation.valid ? (
                  <CheckCircle2 className="h-5 w-5 mt-0.5" />
                ) : (
                  <XCircle className="h-5 w-5 mt-0.5" />
                )}
                <AlertDescription className="flex-1">
                  {validation.valid ? (
                    <div className="space-y-2">
                      <p className="font-semibold">✅ Your team is valid!</p>
                      {validation.canonical_text && (
                        <div>
                          <p className="text-sm mb-2">Canonical export:</p>
                          <div className="bg-muted p-2 rounded text-xs font-mono whitespace-pre-wrap">
                            {validation.canonical_text}
                          </div>
                          <Button
                            variant="outline"
                            size="sm"
                            className="mt-2"
                            onClick={handleCopyCanonical}
                          >
                            <Copy className="h-4 w-4 mr-2" />
                            Copy Team
                          </Button>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div>
                      <p className="font-semibold mb-2">❌ Team validation failed:</p>
                      <ul className="list-disc list-inside space-y-1">
                        {validation.errors.map((error, i) => (
                          <li key={i} className="text-sm">{error}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </AlertDescription>
              </div>
            </Alert>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
```

**Action**: Create this component.

---

### 🎯 Phase 5: Replay Library (Week 3) - LOW PRIORITY

**Goal**: Display completed matches with replay links.

#### Step 5.1: Create Replay Library Component

**Create**: `components/showdown/replay-library.tsx`

```typescript
'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ExternalLink, Search } from 'lucide-react';
import { useRouter } from 'next/navigation';

interface Replay {
  id: string;
  match_id: string;
  team1_name: string;
  team2_name: string;
  winner_name: string;
  replay_url: string;
  week: number;
  created_at: string;
}

export default function ReplayLibrary() {
  const [replays, setReplays] = useState<Replay[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    fetchReplays();
  }, []);

  const fetchReplays = async () => {
    try {
      const response = await fetch('/api/matches?status=completed&include_replays=true');
      const data = await response.json();
      setReplays(data || []);
    } catch (error) {
      console.error('Failed to fetch replays:', error);
    } finally {
      setLoading(false);
    }
  };

  const filtered = replays.filter(r =>
    r.team1_name.toLowerCase().includes(search.toLowerCase()) ||
    r.team2_name.toLowerCase().includes(search.toLowerCase()) ||
    r.winner_name.toLowerCase().includes(search.toLowerCase())
  );

  if (loading) {
    return <div className="text-center py-8">Loading replays...</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Search className="h-5 w-5 text-muted-foreground" />
        <Input
          placeholder="Search replays by team name..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-md"
        />
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          {search ? 'No replays found matching your search' : 'No replays available yet'}
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filtered.map(replay => (
            <Card key={replay.id}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">Week {replay.week}</CardTitle>
                  <Badge variant="outline">Completed</Badge>
                </div>
                <CardDescription>
                  {replay.team1_name} vs {replay.team2_name}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <p className="text-sm font-medium">Winner:</p>
                  <p className="text-sm text-muted-foreground">{replay.winner_name}</p>
                </div>
                
                {replay.replay_url && (
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={() => window.open(replay.replay_url, '_blank')}
                  >
                    <ExternalLink className="h-4 w-4 mr-2" />
                    View Replay
                  </Button>
                )}
                
                <Button
                  variant="ghost"
                  className="w-full"
                  onClick={() => router.push(`/matches/${replay.match_id}`)}
                >
                  View Match Details
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
```

**Action**: Create this component.

---

## Quick Start Checklist

### Immediate Actions (Today)

- [ ] **Step 1**: Run database migration to add Showdown fields
- [ ] **Step 2**: Add environment variables for Showdown server
- [ ] **Step 3**: Install koffingjs: `pnpm add koffingjs`
- [ ] **Step 4**: Create `lib/team-parser.ts` module
- [ ] **Step 5**: Create `app/api/showdown/create-room/route.ts`
- [ ] **Step 6**: Create `app/api/showdown/validate-team/route.ts`

### This Week

- [ ] **Step 7**: Create `components/showdown/match-lobby.tsx`
- [ ] **Step 8**: Create `components/showdown/team-builder.tsx`
- [ ] **Step 9**: Update `app/showdown/page.tsx` with tabs
- [ ] **Step 10**: Test room creation flow end-to-end

### Next Week

- [ ] **Step 11**: Create `components/showdown/replay-library.tsx`
- [ ] **Step 12**: Enhance team builder with Showdown export
- [ ] **Step 13**: Add error handling and loading states
- [ ] **Step 14**: Test team validation with real drafted rosters

---

## Testing Strategy

### Manual Testing Steps

1. **Room Creation Test**:
   - Navigate to `/showdown`
   - Click "Launch Battle" on a scheduled match
   - Verify room URL opens in new tab
   - Check database for `showdown_room_id` and `showdown_room_url`

2. **Team Validation Test**:
   - Go to Team Validator tab
   - Paste a valid Showdown team export
   - Verify validation passes
   - Paste an invalid team (Pokemon not in roster)
   - Verify errors are shown

3. **Replay Library Test**:
   - Complete a match with a replay URL
   - Navigate to Replay Library tab
   - Verify replay appears
   - Test search functionality

---

## Notes & Considerations

### Showdown Server API

**Important**: The exact API endpoints for your Showdown server may differ. You'll need to:

1. Check your Showdown server's API documentation
2. Adjust the `create-room` endpoint to match your server's API
3. May need to implement authentication if your server requires it

### Team Validation

The team validation currently checks:
- Pokemon is in drafted roster
- Team size (6-10 Pokemon)
- Basic league rules (banned items/moves)

You may want to enhance this with:
- Tera type validation
- Level cap checking
- Species clause enforcement
- Item clause enforcement

### Error Handling

Add proper error handling for:
- Network failures
- Invalid team formats
- Missing roster data
- Showdown server downtime

---

## Next Steps After MVP

Once the basic integration is working:

1. **Enhanced Team Builder**: Add moveset/item configuration UI
2. **Replay Parsing**: Parse replay data for statistics
3. **Analytics Dashboard**: Show usage stats, win rates, etc.
4. **Discord Integration**: Auto-post battle results to Discord
5. **Automated Result Capture**: Parse Showdown room events automatically

---

## Support & Resources

- **koffingjs Docs**: https://github.com/itsjavi/koffingjs
- **Showdown Protocol**: https://github.com/smogon/pokemon-showdown/blob/master/PROTOCOL.md
- **Your Showdown Server**: Check your server's API documentation

---

**Ready to start? Begin with Step 1 (Database Migration) and work through the checklist sequentially.**
