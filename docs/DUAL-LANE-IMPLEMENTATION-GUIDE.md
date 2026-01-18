# Dual-Lane MCP Implementation Guide

**Date**: January 18, 2026  
**Status**: Implementation Ready  
**Purpose**: Step-by-step implementation guide for dual-lane architecture

---

## Quick Start: Immediate Fixes

### Step 1: Fix Chat Route Tool Call Visibility

**Current Issue**: Tool calls may not be properly surfaced in the stream.

**Solution**: Ensure `toUIMessageStreamResponse` properly emits tool call events.

**File**: `app/api/ai/assistant/route.ts`

**Check**: Verify that tool calls are being captured and streamed. The Vercel AI SDK's `toUIMessageStreamResponse` should handle this automatically, but we need to ensure:

1. Tools are properly configured
2. Tool calls are executed
3. Results are included in the stream

**Test**: Send a message like "What Pokémon are available?" and verify tool call cards appear.

---

## Phase 1: Command Panel Route Implementation

### Step 1: Create Analysis Jobs Route

**File**: `app/api/ai/analysis-jobs/run/route.ts`

```typescript
import { streamText } from 'ai'
import { openai } from '@ai-sdk/openai'
import { createServerClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

const MCP_SERVER_URL = process.env.MCP_DRAFT_POOL_SERVER_URL || 'https://mcp-draft-pool.moodmnky.com/mcp'
const MCP_API_KEY = process.env.MCP_API_KEY

type JobType = 
  | 'assess_type_coverage'
  | 'draft_strategy'
  | 'compare_teams'
  | 'calculate_points'
  | 'analyze_team'

interface JobParameters {
  teamId?: string
  teamId2?: string
  uploadedTeam?: Array<{ name: string; [key: string]: any }>
  seasonId?: string
}

// MCP REST API client
async function callMcpTool(toolName: string, args: any) {
  const response = await fetch(`${MCP_SERVER_URL.replace('/mcp', '')}/api/${toolName}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${MCP_API_KEY}`,
    },
    body: JSON.stringify(args),
  })
  
  if (!response.ok) {
    throw new Error(`MCP tool call failed: ${response.statusText}`)
  }
  
  return response.json()
}

// Call MCP prompt
async function callMcpPrompt(promptName: string, args: any) {
  // MCP prompts are accessed via the MCP protocol
  // For now, we'll use REST API equivalents or direct tool calls
  // This is a placeholder - actual implementation depends on MCP server prompt API
  throw new Error('MCP prompt calls not yet implemented via REST')
}

export async function POST(request: Request) {
  try {
    const supabase = await createServerClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { jobType, parameters }: { jobType: JobType; parameters: JobParameters } = body

    if (!jobType) {
      return NextResponse.json({ error: 'jobType is required' }, { status: 400 })
    }

    // Route to appropriate job handler
    switch (jobType) {
      case 'assess_type_coverage':
        return await handleTypeCoverage(parameters)
      case 'draft_strategy':
        return await handleDraftStrategy(parameters)
      case 'compare_teams':
        return await handleCompareTeams(parameters)
      case 'calculate_points':
        return await handleCalculatePoints(parameters)
      case 'analyze_team':
        return await handleAnalyzeTeam(parameters)
      default:
        return NextResponse.json({ error: 'Unknown job type' }, { status: 400 })
    }
  } catch (error) {
    console.error('[Analysis Jobs] Error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Job execution failed' },
      { status: 500 }
    )
  }
}

// Job Handlers

async function handleTypeCoverage(params: JobParameters) {
  if (!params.teamId) {
    return NextResponse.json({ error: 'teamId is required' }, { status: 400 })
  }

  // Get team picks
  const picks = await callMcpTool('get_team_picks', {
    team_id: params.teamId,
    season_id: params.seasonId,
  })

  // Get types for each Pokémon
  const typeData = await Promise.all(
    picks.pokemon.map((p: any) =>
      callMcpTool('get_pokemon_types', { pokemon_name: p.pokemon_name })
    )
  )

  // Analyze type coverage
  const types = new Set<string>()
  typeData.forEach((td: any) => {
    if (td.primary_type) types.add(td.primary_type)
    if (td.secondary_type) types.add(td.secondary_type)
  })

  // Use GPT-5 for synthesis
  const result = await streamText({
    model: openai('gpt-4o'), // Use gpt-5.2 when available
    system: `You are an expert Pokémon type coverage analyst. Analyze the provided type coverage data and provide insights.`,
    prompt: `Analyze the type coverage for this team:

Team ID: ${params.teamId}
Pokémon: ${picks.pokemon.map((p: any) => p.pokemon_name).join(', ')}
Types Covered: ${Array.from(types).join(', ')}

Provide:
1. Type coverage assessment
2. Missing types and their importance
3. Recommendations for improvement
4. Synergy analysis`,
  })

  return result.toDataStreamResponse()
}

async function handleDraftStrategy(params: JobParameters) {
  if (!params.teamId) {
    return NextResponse.json({ error: 'teamId is required' }, { status: 400 })
  }

  // Get team budget
  const budget = await callMcpTool('get_team_budget', {
    team_id: params.teamId,
    season_id: params.seasonId,
  })

  // Get team picks
  const picks = await callMcpTool('get_team_picks', {
    team_id: params.teamId,
    season_id: params.seasonId,
  })

  // Get available Pokémon
  const available = await callMcpTool('get_available_pokemon', {
    limit: 50,
  })

  // Use GPT-5 for synthesis
  const result = await streamText({
    model: openai('gpt-4o'), // Use gpt-5.2 when available
    system: `You are an expert Pokémon draft strategist. Analyze team composition and provide strategic recommendations.`,
    prompt: `Analyze draft strategy for this team:

Team ID: ${params.teamId}
Budget: ${budget.total_points} total, ${budget.spent_points} spent, ${budget.remaining_points} remaining
Current Picks: ${picks.pokemon.map((p: any) => `${p.pokemon_name} (${p.point_value} pts)`).join(', ')}
Available Pokémon: ${available.pokemon.slice(0, 10).map((p: any) => p.pokemon_name).join(', ')}...

Provide:
1. Current roster assessment
2. Budget analysis
3. Recommended next picks
4. Strategic considerations
5. Risk assessment`,
  })

  return result.toDataStreamResponse()
}

async function handleCompareTeams(params: JobParameters) {
  if (!params.teamId || !params.teamId2) {
    return NextResponse.json({ error: 'Both teamId and teamId2 are required' }, { status: 400 })
  }

  // Get both teams' data
  const [team1Budget, team1Picks, team2Budget, team2Picks] = await Promise.all([
    callMcpTool('get_team_budget', { team_id: params.teamId, season_id: params.seasonId }),
    callMcpTool('get_team_picks', { team_id: params.teamId, season_id: params.seasonId }),
    callMcpTool('get_team_budget', { team_id: params.teamId2, season_id: params.seasonId }),
    callMcpTool('get_team_picks', { team_id: params.teamId2, season_id: params.seasonId }),
  ])

  // Use GPT-5 for synthesis
  const result = await streamText({
    model: openai('gpt-4o'), // Use gpt-5.2 when available
    system: `You are an expert Pokémon team comparison analyst. Compare two teams and provide insights.`,
    prompt: `Compare these two teams:

Team 1 (${params.teamId}):
Budget: ${team1Budget.total_points} total, ${team1Budget.spent_points} spent
Picks: ${team1Picks.pokemon.map((p: any) => `${p.pokemon_name} (${p.point_value} pts)`).join(', ')}

Team 2 (${params.teamId2}):
Budget: ${team2Budget.total_points} total, ${team2Budget.spent_points} spent
Picks: ${team2Picks.pokemon.map((p: any) => `${p.pokemon_name} (${p.point_value} pts)`).join(', ')}

Provide:
1. Budget comparison
2. Roster comparison
3. Type coverage comparison
4. Strategic advantages/disadvantages
5. Matchup prediction`,
  })

  return result.toDataStreamResponse()
}

async function handleCalculatePoints(params: JobParameters) {
  if (!params.uploadedTeam || params.uploadedTeam.length === 0) {
    return NextResponse.json({ error: 'uploadedTeam is required' }, { status: 400 })
  }

  // Get point values for each Pokémon
  const pointData = await Promise.all(
    params.uploadedTeam.map((pokemon: any) =>
      callMcpTool('get_available_pokemon', {
        limit: 1,
        // Filter by name (assuming MCP server supports this)
      }).then((result: any) => {
        const match = result.pokemon.find((p: any) => 
          p.pokemon_name.toLowerCase() === pokemon.name.toLowerCase()
        )
        return match ? match.point_value : null
      })
    )
  )

  const totalPoints = pointData.reduce((sum, points) => sum + (points || 0), 0)

  // Use GPT-5 for analysis
  const result = await streamText({
    model: openai('gpt-4o'), // Use gpt-5.2 when available
    system: `You are an expert Pokémon draft budget analyst. Analyze team point totals and provide insights.`,
    prompt: `Analyze this team's point total:

Team: ${params.uploadedTeam.map((p: any) => p.name).join(', ')}
Total Points: ${totalPoints}
Budget: 120 points (league standard)

Provide:
1. Point total assessment
2. Budget efficiency analysis
3. Value assessment
4. Recommendations`,
  })

  return result.toDataStreamResponse()
}

async function handleAnalyzeTeam(params: JobParameters) {
  if (!params.uploadedTeam || params.uploadedTeam.length === 0) {
    return NextResponse.json({ error: 'uploadedTeam is required' }, { status: 400 })
  }

  // Get comprehensive data for each Pokémon
  const pokemonData = await Promise.all(
    params.uploadedTeam.map(async (pokemon: any) => {
      const [types, meta, value] = await Promise.all([
        callMcpTool('get_pokemon_types', { pokemon_name: pokemon.name }).catch(() => null),
        callMcpTool('get_smogon_meta', { pokemon_name: pokemon.name }).catch(() => null),
        callMcpTool('analyze_pick_value', { 
          pokemon_name: pokemon.name,
          point_value: pokemon.point_value || 0,
        }).catch(() => null),
      ])
      
      return {
        name: pokemon.name,
        types,
        meta,
        value,
      }
    })
  )

  // Use GPT-5 for comprehensive synthesis
  const result = await streamText({
    model: openai('gpt-4o'), // Use gpt-5.2 when available
    system: `You are an expert Pokémon team analyst. Provide comprehensive team analysis including type coverage, roles, synergy, and strategic recommendations.`,
    prompt: `Analyze this uploaded team comprehensively:

${JSON.stringify(pokemonData, null, 2)}

Provide:
1. Type coverage analysis
2. Role distribution
3. Synergy assessment
4. Weakness identification
5. Meta alignment
6. Strategic recommendations
7. Point efficiency (if available)`,
  })

  return result.toDataStreamResponse()
}
```

---

## Phase 2: Command Panel UI Component

**File**: `components/ai/command-panel.tsx`

```tsx
'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { ShieldIcon, TrendingUpIcon, UsersIcon, CalculatorIcon, FileTextIcon } from 'lucide-react'
import { TeamUpload } from './team-upload'

interface CommandPanelProps {
  teamId?: string
  teamId2?: string
  seasonId?: string
  onJobComplete?: (result: any) => void
}

export function CommandPanel({
  teamId,
  teamId2,
  seasonId,
  onJobComplete,
}: CommandPanelProps) {
  const [uploadedTeam, setUploadedTeam] = useState<any[]>([])
  const [isRunning, setIsRunning] = useState(false)

  const runJob = async (jobType: string, parameters: any) => {
    setIsRunning(true)
    try {
      const response = await fetch('/api/ai/analysis-jobs/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jobType, parameters }),
      })

      if (!response.ok) {
        throw new Error('Job failed')
      }

      // Handle streaming response
      const reader = response.body?.getReader()
      const decoder = new TextDecoder()

      if (reader) {
        while (true) {
          const { done, value } = await reader.read()
          if (done) break

          const chunk = decoder.decode(value)
          // Process SSE chunks
          // This is simplified - you'd want proper SSE parsing
        }
      }

      onJobComplete?.({ jobType, success: true })
    } catch (error) {
      console.error('Job error:', error)
      onJobComplete?.({ jobType, success: false, error })
    } finally {
      setIsRunning(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Command Panel</CardTitle>
        <CardDescription>Structured analysis workflows</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Team-based Analysis */}
        {teamId && (
          <div className="space-y-2">
            <h3 className="text-sm font-semibold">Team Analysis</h3>
            <div className="grid grid-cols-2 gap-2">
              <Button
                onClick={() => runJob('assess_type_coverage', { teamId, seasonId })}
                disabled={isRunning}
                variant="outline"
              >
                <ShieldIcon className="mr-2 h-4 w-4" />
                Assess Type Coverage
              </Button>
              <Button
                onClick={() => runJob('draft_strategy', { teamId, seasonId })}
                disabled={isRunning}
                variant="outline"
              >
                <TrendingUpIcon className="mr-2 h-4 w-4" />
                Draft Strategy
              </Button>
            </div>
          </div>
        )}

        {/* Team Comparison */}
        {teamId && teamId2 && (
          <div className="space-y-2">
            <h3 className="text-sm font-semibold">Comparison</h3>
            <Button
              onClick={() => runJob('compare_teams', { teamId, teamId2, seasonId })}
              disabled={isRunning}
              variant="outline"
              className="w-full"
            >
              <UsersIcon className="mr-2 h-4 w-4" />
              Compare Teams
            </Button>
          </div>
        )}

        {/* Team Upload */}
        <div className="space-y-2">
          <h3 className="text-sm font-semibold">Upload Team</h3>
          <TeamUpload
            onUpload={setUploadedTeam}
            disabled={isRunning}
          />
          {uploadedTeam.length > 0 && (
            <div className="space-y-2">
              <Button
                onClick={() => runJob('calculate_points', { uploadedTeam })}
                disabled={isRunning}
                variant="outline"
                className="w-full"
              >
                <CalculatorIcon className="mr-2 h-4 w-4" />
                Calculate Points
              </Button>
              <Button
                onClick={() => runJob('analyze_team', { uploadedTeam })}
                disabled={isRunning}
                variant="outline"
                className="w-full"
              >
                <FileTextIcon className="mr-2 h-4 w-4" />
                Full Team Analysis
              </Button>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
```

---

## Next Steps

1. **Fix Chat Route**: Verify tool call visibility (test with current implementation)
2. **Create Analysis Jobs Route**: Implement the route above
3. **Create Command Panel Component**: Build the UI component
4. **Test Integration**: Test with real MCP server calls
5. **Add Team Upload Parser**: Implement Showdown format parsing

---

**Status**: Ready for Implementation  
**Last Updated**: January 18, 2026
