# Next Steps: Showdown Integration

## ✅ Completed

1. **Showdown Client Connected** - Client successfully connects to server
2. **Custom Format Created** - `[Gen 9] Average at Best Draft` format defined in `tools/showdown-server/config/custom-formats.ts`

## 🔄 Next Steps

### 1. Test Custom Format (Immediate)

Restart the Showdown server to load the custom format:

```bash
cd /home/moodmnky/POKE-MNKY
docker compose restart pokemon-showdown
```

Then verify the format appears in the client:
- Go to https://play.moodmnky.com
- Click "Battle!" or "Format"
- Look for "Average at Best Draft League" section
- Format should be: `[Gen 9] Average at Best Draft`

### 2. Create API Endpoints (Next.js App - Separate Repo)

Create these endpoints in your Next.js app:

#### `/app/api/showdown/validate-team/route.ts`

This endpoint validates teams against drafted rosters:

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/service';
import { parseShowdownTeam } from '@/lib/team-parser';

export async function POST(request: NextRequest) {
  // Verify Showdown API key
  const apiKey = request.headers.get('Authorization')?.replace('Bearer ', '');
  if (apiKey !== process.env.SHOWDOWN_API_KEY) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { team, user_id, match_id } = await request.json();
  
  const supabase = createClient();
  
  // Get user's drafted roster for current season
  const { data: match } = await supabase
    .from('matches')
    .select('season_id, team1_id, team2_id')
    .eq('id', match_id)
    .single();
  
  if (!match) {
    return NextResponse.json({ valid: false, errors: ['Match not found'] }, { status: 404 });
  }
  
  // Determine which team the user belongs to
  const teamId = match.team1_id === user_id ? match.team1_id : match.team2_id;
  
  const { data: roster } = await supabase
    .from('team_rosters')
    .select('pokemon_id, pokemon_name')
    .eq('team_id', teamId)
    .eq('season_id', match.season_id);
  
  // Parse Showdown team export
  const parsedTeam = await parseShowdownTeam(team);
  
  // Validate each Pokemon is in roster
  const invalid = parsedTeam.pokemon.filter(
    p => !roster?.some(r => 
      r.pokemon_name.toLowerCase() === p.name.toLowerCase() ||
      r.pokemon_id === parseInt(p.name.match(/\d+/)?.[0] || '0')
    )
  );
  
  if (invalid.length > 0) {
    return NextResponse.json({
      valid: false,
      errors: invalid.map(p => `${p.name} is not on your drafted roster`)
    }, { status: 400 });
  }
  
  // Validate league rules (items, moves, tera types)
  const ruleViolations = await validateLeagueRules(parsedTeam, match_id);
  
  if (ruleViolations.length > 0) {
    return NextResponse.json({
      valid: false,
      errors: ruleViolations
    }, { status: 400 });
  }
  
  return NextResponse.json({ valid: true });
}
```

#### `/app/api/showdown/create-room/route.ts`

This endpoint creates battle rooms on Showdown:

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/service';

export async function POST(request: NextRequest) {
  const { match_id } = await request.json();
  
  const supabase = createClient();
  
  // Get match details
  const { data: match } = await supabase
    .from('matches')
    .select('team1_id, team2_id, week')
    .eq('id', match_id)
    .single();
  
  if (!match) {
    return NextResponse.json({ error: 'Match not found' }, { status: 404 });
  }
  
  // Create room on Showdown server via HTTP API
  // Note: Showdown doesn't have a built-in HTTP API for room creation
  // We'll need to use the WebSocket protocol or create a custom endpoint
  // For now, return a room URL that users can manually create
  
  const roomId = `gen9avgatbest-${match_id.slice(0, 8)}`;
  const roomUrl = `https://play.moodmnky.com/${roomId}`;
  
  // Update match record with room info
  await supabase
    .from('matches')
    .update({
      showdown_room_id: roomId,
      showdown_room_url: roomUrl,
      status: 'in_progress'
    })
    .eq('id', match_id);
  
  return NextResponse.json({ room_id: roomId, room_url: roomUrl });
}
```

#### `/lib/team-parser.ts`

Team parsing utility using koffingjs:

```typescript
// Install: pnpm add koffingjs

import { parseTeam, exportTeam } from 'koffingjs';

export interface ParsedTeam {
  pokemon: Array<{
    name: string;
    item?: string;
    ability?: string;
    moves: string[];
    nature?: string;
    evs?: Record<string, number>;
    ivs?: Record<string, number>;
    teraType?: string;
  }>;
  errors: string[];
  canonicalText: string;
}

export async function parseShowdownTeam(teamText: string): Promise<ParsedTeam> {
  try {
    const parsed = parseTeam(teamText);
    const canonical = exportTeam(parsed);
    
    return {
      pokemon: parsed.team,
      errors: [],
      canonicalText: canonical
    };
  } catch (error: any) {
    return {
      pokemon: [],
      errors: [error.message],
      canonicalText: teamText
    };
  }
}

export async function validateLeagueRules(
  team: ParsedTeam,
  matchId: string
): Promise<string[]> {
  const errors: string[] = [];
  
  // Check Item Clause = 2 (max 2 Pokemon with same item)
  const itemCounts: Record<string, number> = {};
  for (const pokemon of team.pokemon) {
    if (pokemon.item) {
      itemCounts[pokemon.item] = (itemCounts[pokemon.item] || 0) + 1;
      if (itemCounts[pokemon.item] > 2) {
        errors.push(`Item Clause violation: ${pokemon.item} is used on more than 2 Pokemon`);
      }
    }
  }
  
  // Check banned moves
  const bannedMoves: Record<string, string[]> = {
    'Darkrai': ['Dark Void'],
    'Basculegion': ['Last Respects'],
    'Houndstone': ['Last Respects'],
    'Meloetta': ['Relic Song'],
    'Cyclizar': ['Shed Tail'],
  };
  
  for (const pokemon of team.pokemon) {
    const banned = bannedMoves[pokemon.name];
    if (banned) {
      for (const move of pokemon.moves) {
        if (banned.includes(move)) {
          errors.push(`${pokemon.name} cannot use ${move}`);
        }
      }
    }
  }
  
  return errors;
}
```

### 3. Add Server-Side Validation (Showdown Server)

Create a server plugin to add `validateTeam` to the custom format:

**File**: `tools/showdown-server/server/chat-plugins/draft-league.ts`

```typescript
import { Chat } from '../../server/chat';
import { Dex } from '../../sim/dex';

export const DraftLeague: Chat.ChatPlugin = {
	name: 'Draft League Validation',
	description: 'Validates teams against drafted rosters for Average at Best',

	onLoad() {
		// Add validateTeam function to the custom format
		const format = Dex.formats.get('[Gen 9] Average at Best Draft');
		if (format) {
			format.validateTeam = async function(team: any, user: any) {
				// Call our API endpoint
				const response = await fetch(`${process.env.APP_URL}/api/showdown/validate-team`, {
					method: 'POST',
					headers: {
						'Authorization': `Bearer ${process.env.SHOWDOWN_API_KEY}`,
						'Content-Type': 'application/json'
					},
					body: JSON.stringify({
						team: team.export(),
						user_id: user.id,
						match_id: user.currentMatchId || null
					})
				});
				
				if (!response.ok) {
					const data = await response.json();
					return data.errors || ['Team validation failed'];
				}
				
				return null; // null means valid
			};
		}
	}
};
```

### 4. Environment Variables

Add to your `.env` files:

```bash
# Showdown Integration
SHOWDOWN_API_KEY=your-generated-api-key-here
SHOWDOWN_SERVER_URL=http://showdown.moodmnky.com:8000
NEXT_PUBLIC_SHOWDOWN_CLIENT_URL=https://play.moodmnky.com
```

### 5. Test Complete Flow

1. **Test Format Appears**: Restart server, check client
2. **Test Team Validation**: Create a test team, validate via API
3. **Test Room Creation**: Create a match, generate room URL
4. **Test Battle Flow**: Launch battle, complete, capture result

## 📝 Notes

- The custom format is automatically loaded by Showdown server
- Team validation happens server-side via API call
- Room creation can be manual (users create rooms) or automated (via WebSocket API)
- Integration worker will handle replay capture (Phase 2)

## 🔗 Related Files

- Custom Format: `tools/showdown-server/config/custom-formats.ts`
- Nginx Config: `config/nginx-showdown.conf`
- Docker Compose: `docker-compose.yml`
- Comprehensive Plan: `comprehensive-showdown-buildout-plan.md`
