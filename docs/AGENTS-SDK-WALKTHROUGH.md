# Agents SDK - Complete Walkthrough & Testing Guide

**Date**: January 17, 2026  
**Status**: ✅ **IMPLEMENTATION COMPLETE**  
**Purpose**: Comprehensive guide for testing, validating, and using the Agents SDK in POKE-MNKY-v2

---

## 📋 Table of Contents

1. [What We Set Up](#what-we-set-up)
2. [Architecture Overview](#architecture-overview)
3. [Component Breakdown](#component-breakdown)
4. [Testing Procedures](#testing-procedures)
5. [Validation Steps](#validation-steps)
6. [Frontend Integration](#frontend-integration)
7. [Usage Examples](#usage-examples)
8. [Troubleshooting](#troubleshooting)

---

## 🏗️ What We Set Up

### Packages Installed

```bash
pnpm install @openai/agents @modelcontextprotocol/sdk
```

**Installed Versions**:
- `@openai/agents@0.3.9` - Agents SDK (includes MCPServerStreamableHttp)
- `@modelcontextprotocol/sdk@1.25.2` - MCP SDK

### Files Created

#### Agent Implementations (`lib/agents/`)
- ✅ `draft-assistant.ts` - Draft pick recommendations agent
- ✅ `free-agency-agent.ts` - Free agency & trade analysis agent
- ✅ `battle-strategy-agent.ts` - Battle strategy & matchups agent
- ✅ `index.ts` - Centralized exports and initialization helpers

#### API Routes (`app/api/ai/`)
- ✅ `draft-assistant/route.ts` - POST `/api/ai/draft-assistant`
- ✅ `free-agency/route.ts` - POST `/api/ai/free-agency`
- ✅ `battle-strategy/route.ts` - POST `/api/ai/battle-strategy`

---

## 🏛️ Architecture Overview

### System Flow

```
┌─────────────────────────────────────────┐
│         Frontend (React)                │
│  - User interacts with UI               │
│  - Calls API routes                      │
└──────────────┬──────────────────────────┘
               │ HTTP POST
               ▼
┌─────────────────────────────────────────┐
│      API Routes (/api/ai/*)             │
│  - Authentication check                  │
│  - Request validation                    │
│  - Call agent functions                  │
└──────────────┬──────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────┐
│      Agent Implementations              │
│  (lib/agents/*.ts)                      │
│  - Agent initialization                 │
│  - MCP server connection                │
│  - Agent.run() execution                │
└──────────────┬──────────────────────────┘
               │
       ┌───────┴───────┐
       ▼               ▼
┌─────────────┐  ┌─────────────┐
│   OpenAI    │  │  MCP Server │
│   Agents    │  │  (Draft Pool)│
│   SDK       │  └──────┬───────┘
└─────────────┘         │
                        ▼
                ┌─────────────┐
                │  Supabase   │
                │  Database   │
                └─────────────┘
```

### Agent Architecture

Each agent follows this pattern:

1. **MCP Server Connection**: `MCPServerStreamableHttp` connects to Draft Pool MCP
2. **Agent Creation**: `Agent` instance with instructions and MCP servers
3. **Execution**: `run(agent, prompt)` executes the agent
4. **Tool Usage**: Agent automatically calls MCP tools as needed
5. **Response**: Returns structured output with recommendations

---

## 📦 Component Breakdown

### 1. Draft Assistant Agent

**File**: `lib/agents/draft-assistant.ts`

**Purpose**: Help coaches make optimal draft picks

**Key Components**:
- `draftAssistantAgent` - Agent instance
- `draftPoolMCP` - MCP server connection
- `getDraftRecommendation()` - Full analysis function
- `suggestDraftPick()` - Quick pick suggestion

**MCP Tools Used**:
- `get_available_pokemon` - Query draft pool
- `get_team_budget` - Check budget
- `get_team_picks` - Get roster
- `analyze_pick_value` - Value analysis
- `get_draft_status` - Draft status

**Model**: GPT-5.2 (strategic reasoning)

---

### 2. Free Agency Agent

**File**: `lib/agents/free-agency-agent.ts`

**Purpose**: Assist with free agency decisions and trades

**Key Components**:
- `freeAgencyAgent` - Agent instance
- `evaluateFreeAgencyTarget()` - Evaluate a target
- `evaluateTradeProposal()` - Analyze trade
- `suggestFreeAgencyTargets()` - Find targets

**MCP Tools Used**:
- `get_team_budget` - Budget analysis
- `get_team_picks` - Roster analysis
- `get_available_pokemon` - Available targets
- `analyze_pick_value` - Value evaluation

**Model**: GPT-5.2 (strategic analysis)

---

### 3. Battle Strategy Agent

**File**: `lib/agents/battle-strategy-agent.ts`

**Purpose**: Provide battle strategy and move recommendations

**Key Components**:
- `battleStrategyAgent` - Agent instance
- `analyzeMatchup()` - Team matchup analysis
- `suggestBattleMoves()` - Move recommendations
- `recommendTeraTypes()` - Tera type suggestions

**MCP Tools Used**:
- `get_team_picks` - Team rosters
- `get_available_pokemon` - Pokémon data

**Model**: GPT-4.1 (tactical decisions)

---

## 🧪 Testing Procedures

### Step 1: Verify Packages Installed

```bash
cd c:\DEV-MNKY\MOOD_MNKY\POKE-MNKY-v2
pnpm list @openai/agents
pnpm list @modelcontextprotocol/sdk
```

**Expected Output**:
```
@openai/agents 0.3.9
@modelcontextprotocol/sdk 1.25.2
```

---

### Step 2: Verify MCP Server is Running

**Check Draft Pool MCP Server**:
```bash
curl http://localhost:3001/health
# OR
curl https://mcp-draft-pool.moodmnky.com/health
```

**Expected Response**:
```json
{
  "status": "ok",
  "service": "poke-mnky-draft-pool-mcp-server"
}
```

---

### Step 3: Test Agent Imports

Create a test file: `scripts/test-agent-imports.ts`

```typescript
// scripts/test-agent-imports.ts
import { draftAssistantAgent } from '../lib/agents/draft-assistant'
import { freeAgencyAgent } from '../lib/agents/free-agency-agent'
import { battleStrategyAgent } from '../lib/agents/battle-strategy-agent'

console.log('✅ Draft Assistant Agent:', draftAssistantAgent.name)
console.log('✅ Free Agency Agent:', freeAgencyAgent.name)
console.log('✅ Battle Strategy Agent:', battleStrategyAgent.name)
console.log('✅ All agents imported successfully!')
```

**Run**:
```bash
pnpm tsx scripts/test-agent-imports.ts
```

**Expected Output**:
```
✅ Draft Assistant Agent: Draft Assistant
✅ Free Agency Agent: Free Agency Assistant
✅ Battle Strategy Agent: Battle Strategy Assistant
✅ All agents imported successfully!
```

---

### Step 4: Test API Routes

#### Test Draft Assistant API

```bash
# Full recommendation
curl -X POST http://localhost:3000/api/ai/draft-assistant \
  -H "Content-Type: application/json" \
  -H "Cookie: your-auth-cookie" \
  -d '{
    "teamId": "test-team-id",
    "action": "recommendation",
    "context": "Need a water type attacker"
  }'

# Quick pick suggestion
curl -X POST http://localhost:3000/api/ai/draft-assistant \
  -H "Content-Type: application/json" \
  -H "Cookie: your-auth-cookie" \
  -d '{
    "teamId": "test-team-id",
    "action": "suggest",
    "budgetRemaining": 45,
    "pointRange": [15, 20]
  }'
```

#### Test Free Agency API

```bash
# Evaluate target
curl -X POST http://localhost:3000/api/ai/free-agency \
  -H "Content-Type: application/json" \
  -H "Cookie: your-auth-cookie" \
  -d '{
    "teamId": "test-team-id",
    "action": "evaluate",
    "pokemonName": "Blastoise"
  }'

# Evaluate trade
curl -X POST http://localhost:3000/api/ai/free-agency \
  -H "Content-Type: application/json" \
  -H "Cookie: your-auth-cookie" \
  -d '{
    "teamId": "test-team-id",
    "action": "trade",
    "proposedTrade": {
      "giving": ["Pikachu"],
      "receiving": ["Blastoise"]
    }
  }'
```

#### Test Battle Strategy API

```bash
# Matchup analysis
curl -X POST http://localhost:3000/api/ai/battle-strategy \
  -H "Content-Type: application/json" \
  -H "Cookie: your-auth-cookie" \
  -d '{
    "action": "matchup",
    "team1Id": "team-1-id",
    "team2Id": "team-2-id"
  }'
```

---

### Step 5: Test MCP Connection

Create test file: `scripts/test-mcp-connection.ts`

```typescript
// scripts/test-mcp-connection.ts
import { initializeDraftAssistant, closeDraftAssistant } from '../lib/agents/draft-assistant'

async function testMCPConnection() {
  try {
    console.log('Connecting to MCP server...')
    await initializeDraftAssistant()
    console.log('✅ MCP connection successful!')
    
    // Test would go here - call agent, etc.
    
    await closeDraftAssistant()
    console.log('✅ MCP connection closed successfully!')
  } catch (error) {
    console.error('❌ MCP connection failed:', error)
    process.exit(1)
  }
}

testMCPConnection()
```

**Run**:
```bash
pnpm tsx scripts/test-mcp-connection.ts
```

---

## ✅ Validation Steps

### Validation Checklist

#### 1. Package Installation ✅
- [ ] `@openai/agents` installed
- [ ] `@modelcontextprotocol/sdk` installed
- [ ] No TypeScript errors in agent files

#### 2. MCP Server Connection ✅
- [ ] Draft Pool MCP server is running
- [ ] Health check returns OK
- [ ] MCP tools are discoverable

#### 3. Agent Initialization ✅
- [ ] All agents can be imported
- [ ] MCP connections can be established
- [ ] No runtime errors on import

#### 4. API Routes ✅
- [ ] All routes return 200/400/401 appropriately
- [ ] Authentication works
- [ ] Request validation works
- [ ] Error handling works

#### 5. Agent Execution ✅
- [ ] Agents can execute prompts
- [ ] MCP tools are called automatically
- [ ] Responses are returned correctly
- [ ] No timeout errors

---

### Validation Script

Create: `scripts/validate-agents.ts`

```typescript
// scripts/validate-agents.ts
import { draftAssistantAgent } from '../lib/agents/draft-assistant'
import { freeAgencyAgent } from '../lib/agents/free-agency-agent'
import { battleStrategyAgent } from '../lib/agents/battle-strategy-agent'

async function validateAgents() {
  const checks = []
  
  // Check 1: Agents can be imported
  checks.push({
    name: 'Agent Imports',
    status: draftAssistantAgent && freeAgencyAgent && battleStrategyAgent ? '✅' : '❌'
  })
  
  // Check 2: Agents have correct names
  checks.push({
    name: 'Agent Names',
    status: draftAssistantAgent.name === 'Draft Assistant' ? '✅' : '❌'
  })
  
  // Check 3: MCP servers configured
  checks.push({
    name: 'MCP Servers',
    status: draftAssistantAgent.mcpServers?.length > 0 ? '✅' : '❌'
  })
  
  console.table(checks)
  
  const allPassed = checks.every(c => c.status === '✅')
  if (allPassed) {
    console.log('\n✅ All validation checks passed!')
  } else {
    console.log('\n❌ Some validation checks failed!')
    process.exit(1)
  }
}

validateAgents()
```

**Run**:
```bash
pnpm tsx scripts/validate-agents.ts
```

---

## 🎨 Frontend Integration

### 1. Create React Hook

**File**: `hooks/use-draft-assistant.ts`

```typescript
// hooks/use-draft-assistant.ts
'use client'

import { useState } from 'react'

interface DraftRecommendationInput {
  teamId: string
  seasonId?: string
  context?: string
  currentPick?: number
}

export function useDraftAssistant() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [recommendation, setRecommendation] = useState<any>(null)

  const getRecommendation = async (input: DraftRecommendationInput) => {
    setLoading(true)
    setError(null)
    
    try {
      const response = await fetch('/api/ai/draft-assistant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...input,
          action: 'recommendation',
        }),
      })

      if (!response.ok) {
        throw new Error(`API error: ${response.statusText}`)
      }

      const data = await response.json()
      setRecommendation(data.recommendation)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setLoading(false)
    }
  }

  const suggestPick = async (teamId: string, budgetRemaining: number, pointRange?: [number, number]) => {
    setLoading(true)
    setError(null)
    
    try {
      const response = await fetch('/api/ai/draft-assistant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          teamId,
          action: 'suggest',
          budgetRemaining,
          pointRange,
        }),
      })

      if (!response.ok) {
        throw new Error(`API error: ${response.statusText}`)
      }

      const data = await response.json()
      setRecommendation({ suggestion: data.suggestion })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setLoading(false)
    }
  }

  return {
    loading,
    error,
    recommendation,
    getRecommendation,
    suggestPick,
  }
}
```

---

### 2. Create React Component

**File**: `components/draft/draft-assistant.tsx`

```typescript
// components/draft/draft-assistant.tsx
'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Loader2, Sparkles } from 'lucide-react'
import { useDraftAssistant } from '@/hooks/use-draft-assistant'

interface DraftAssistantProps {
  teamId: string
  seasonId?: string
}

export function DraftAssistant({ teamId, seasonId }: DraftAssistantProps) {
  const [context, setContext] = useState('')
  const { loading, error, recommendation, getRecommendation, suggestPick } = useDraftAssistant()

  const handleGetRecommendation = () => {
    getRecommendation({
      teamId,
      seasonId,
      context: context || undefined,
    })
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Sparkles className="h-5 w-5" />
          Draft Assistant
        </CardTitle>
        <CardDescription>
          Get AI-powered draft pick recommendations based on your team's needs
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <label className="text-sm font-medium">Context (Optional)</label>
          <Textarea
            placeholder="e.g., Need a water type attacker, looking for speed control..."
            value={context}
            onChange={(e) => setContext(e.target.value)}
            rows={3}
          />
        </div>

        <Button
          onClick={handleGetRecommendation}
          disabled={loading}
          className="w-full"
        >
          {loading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Analyzing...
            </>
          ) : (
            'Get Draft Recommendations'
          )}
        </Button>

        {error && (
          <div className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
            {error}
          </div>
        )}

        {recommendation && (
          <div className="rounded-lg border p-4">
            <h3 className="font-semibold mb-2">Recommendation</h3>
            <div className="prose prose-sm max-w-none">
              <p className="whitespace-pre-wrap">{recommendation.finalOutput}</p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
```

---

### 3. Use in Draft Page

**File**: `app/draft/page.tsx` (example)

```typescript
import { DraftAssistant } from '@/components/draft/draft-assistant'

export default function DraftPage() {
  const teamId = 'your-team-id' // Get from context/auth
  
  return (
    <div className="container mx-auto p-6">
      <h1 className="text-3xl font-bold mb-6">Draft</h1>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Draft board, etc. */}
        
        <DraftAssistant teamId={teamId} />
      </div>
    </div>
  )
}
```

---

## 💡 Usage Examples

### Example 1: Draft Pick Recommendation

**Scenario**: Coach is drafting and needs help choosing next pick

**Frontend Code**:
```typescript
const { getRecommendation } = useDraftAssistant()

await getRecommendation({
  teamId: 'team-uuid',
  context: 'I have 45 points left and need a water type attacker',
  currentPick: 15,
})
```

**What Happens**:
1. Frontend calls `/api/ai/draft-assistant`
2. API route validates request
3. Agent connects to MCP server
4. Agent calls `get_team_picks` to get current roster
5. Agent calls `get_team_budget` to check budget
6. Agent calls `get_available_pokemon` with filters
7. Agent analyzes needs and suggests picks
8. Response returned to frontend

---

### Example 2: Trade Evaluation

**Scenario**: Coach receives trade proposal

**Frontend Code**:
```typescript
const response = await fetch('/api/ai/free-agency', {
  method: 'POST',
  body: JSON.stringify({
    teamId: 'team-uuid',
    action: 'trade',
    proposedTrade: {
      giving: ['Pikachu', 'Charizard'],
      receiving: ['Blastoise', 'Venusaur'],
    },
  }),
})
```

**What Happens**:
1. Agent gets both teams' rosters
2. Agent analyzes Pokémon values
3. Agent evaluates fit for each team
4. Agent calculates impact
5. Agent provides recommendation

---

### Example 3: Battle Matchup Analysis

**Scenario**: Coach preparing for battle

**Frontend Code**:
```typescript
const response = await fetch('/api/ai/battle-strategy', {
  method: 'POST',
  body: JSON.stringify({
    action: 'matchup',
    team1Id: 'my-team-id',
    team2Id: 'opponent-team-id',
  }),
})
```

**What Happens**:
1. Agent gets both teams' rosters
2. Agent analyzes type matchups
3. Agent identifies key advantages
4. Agent suggests optimal leads
5. Agent provides strategic recommendations

---

## 🔧 Troubleshooting

### Issue 1: MCP Connection Fails

**Symptoms**:
- Error: "Failed to connect to MCP server"
- Timeout errors

**Solutions**:
1. Check MCP server is running:
   ```bash
   curl http://localhost:3001/health
   ```

2. Verify environment variable:
   ```bash
   echo $MCP_DRAFT_POOL_SERVER_URL
   # Should be: https://mcp-draft-pool.moodmnky.com/mcp
   ```

3. Check network connectivity:
   ```bash
   curl https://mcp-draft-pool.moodmnky.com/health
   ```

---

### Issue 2: Agent Returns Empty Response

**Symptoms**:
- Agent runs but returns empty `finalOutput`
- No recommendations provided

**Solutions**:
1. Check MCP tools are available:
   ```typescript
   const tools = await draftPoolMCP.getTools()
   console.log('Available tools:', tools)
   ```

2. Verify team ID exists in database
3. Check OpenAI API key is set
4. Review agent logs for errors

---

### Issue 3: TypeScript Errors

**Symptoms**:
- Import errors
- Type errors

**Solutions**:
1. Verify packages installed:
   ```bash
   pnpm list @openai/agents
   ```

2. Check import paths:
   ```typescript
   // Correct:
   import { Agent, run, MCPServerStreamableHttp } from '@openai/agents'
   ```

3. Restart TypeScript server in IDE

---

### Issue 4: Authentication Errors

**Symptoms**:
- 401 Unauthorized errors
- "User not found" errors

**Solutions**:
1. Verify user is logged in
2. Check Supabase session is valid
3. Verify API route authentication:
   ```typescript
   const { data: { user } } = await supabase.auth.getUser()
   ```

---

## 📊 Monitoring & Debugging

### Enable Debug Logging

Set environment variable:
```bash
DEBUG=openai-agents:*
```

### Check Agent Execution

Add logging to agent functions:
```typescript
export async function getDraftRecommendation(input: DraftRecommendationInput) {
  console.log('[Draft Assistant] Input:', input)
  
  const result = await run(draftAssistantAgent, prompt)
  
  console.log('[Draft Assistant] Result:', {
    finalOutput: result.finalOutput,
    usage: result.usage,
    historyLength: result.history.length,
  })
  
  return result
}
```

### Monitor MCP Tool Calls

The agent automatically logs tool calls. Check console for:
```
[Agent] Calling tool: get_available_pokemon
[Agent] Tool result: {...}
```

---

## ✅ Summary Checklist

### Setup Complete ✅
- [x] Packages installed (`@openai/agents`, `@modelcontextprotocol/sdk`)
- [x] Agent implementations created
- [x] API routes created
- [x] MCP server connection configured
- [x] TypeScript types defined

### Testing Complete ✅
- [ ] Packages verified installed
- [ ] MCP server health check passes
- [ ] Agent imports work
- [ ] API routes respond correctly
- [ ] MCP connection establishes

### Integration Complete ✅
- [ ] React hooks created
- [ ] React components created
- [ ] Components integrated into pages
- [ ] Error handling implemented
- [ ] Loading states implemented

### Ready for Production ✅
- [ ] All tests passing
- [ ] Error handling robust
- [ ] Performance acceptable
- [ ] Documentation complete
- [ ] Monitoring in place

---

## 🚀 Next Steps

1. **Test Each Agent**:
   - Run validation script
   - Test API routes
   - Verify MCP connections

2. **Integrate Frontend**:
   - Create React hooks
   - Build UI components
   - Add to relevant pages

3. **Monitor Usage**:
   - Track API calls
   - Monitor errors
   - Measure response times

4. **Enhance Agents**:
   - Add conversation history
   - Implement streaming
   - Add more MCP tools

---

**Document Created**: January 17, 2026  
**Last Updated**: January 17, 2026  
**Status**: ✅ **READY FOR TESTING**
