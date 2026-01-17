# Agents SDK - Current Capabilities & Use Cases

**Date**: January 17, 2026  
**Status**: ✅ **IMPLEMENTATION COMPLETE**  
**Context**: What we can do with Agents SDK given our current ecosystem state

---

## 🎯 Current Ecosystem State

### ✅ What We Have

1. **OpenAI Integration**
   - ✅ OpenAI SDK v6 installed
   - ✅ 6 API routes using OpenAI
   - ✅ Responses API partially implemented
   - ✅ Function calling working

2. **MCP Servers**
   - ✅ Draft Pool MCP Server (5 tools)
   - ✅ Supabase Local MCP
   - ✅ Supabase Remote MCP
   - ✅ Shadcn MCP
   - ✅ Wolfram Alpha MCP

3. **Database**
   - ✅ Supabase PostgreSQL
   - ✅ Team rosters, draft pool, matches
   - ✅ Full league data available

4. **Infrastructure**
   - ✅ Next.js 16 app
   - ✅ API routes ready
   - ✅ TypeScript configured
   - ✅ Node.js v25.3.0

---

## 🚀 What Agents SDK Enables

### 1. Multi-Step Reasoning

**Before (Direct API)**:
- Single API call
- Manual tool calling
- Limited context

**With Agents SDK**:
- ✅ Automatic multi-step reasoning
- ✅ Tool orchestration
- ✅ Context preservation
- ✅ Error recovery

**Example**: Draft pick recommendation
```
User: "What should I pick? I have 45 points left and need a water type."

Agent Process:
1. Get team roster (MCP tool)
2. Analyze type coverage (reasoning)
3. Get available water types (MCP tool)
4. Filter by budget (reasoning)
5. Analyze value (MCP tool)
6. Rank recommendations (reasoning)
7. Return final answer
```

---

### 2. Tool Orchestration

**Current MCP Tools Available**:
- `get_available_pokemon` - Query draft pool
- `get_draft_status` - Draft session status
- `get_team_budget` - Team budget
- `get_team_picks` - Team roster
- `analyze_pick_value` - Value analysis

**Agent Can**:
- ✅ Call multiple tools automatically
- ✅ Use tool results in reasoning
- ✅ Chain tool calls
- ✅ Handle tool errors gracefully

**Example**: Trade evaluation
```
Agent automatically:
1. Gets Team A roster (tool)
2. Gets Team B roster (tool)
3. Analyzes Pokémon being traded (tools)
4. Calculates value impact (reasoning)
5. Considers team needs (reasoning)
6. Provides recommendation
```

---

### 3. Conversation Context

**With Agents SDK**:
- ✅ Conversation history maintained
- ✅ Follow-up questions work
- ✅ Context-aware responses
- ✅ Multi-turn interactions

**Example**:
```
User: "What should I pick?"
Agent: "Based on your team, I recommend Pikachu..."

User: "What about Charizard instead?"
Agent: "Charizard is also good, but considering you already have..."
```

---

### 4. Specialized Agents

**Three Agents Created**:

#### Draft Assistant Agent
- **Purpose**: Draft pick recommendations
- **Model**: GPT-5.2 (strategic reasoning)
- **Tools**: All 5 Draft Pool MCP tools
- **Use Cases**:
  - Real-time draft assistance
  - Budget-aware suggestions
  - Value analysis
  - Team composition analysis

#### Free Agency Agent
- **Purpose**: Free agency & trade analysis
- **Model**: GPT-5.2 (strategic reasoning)
- **Tools**: Draft Pool MCP tools
- **Use Cases**:
  - Target evaluation
  - Trade proposal analysis
  - Roster gap identification
  - Strategic recommendations

#### Battle Strategy Agent
- **Purpose**: Battle tactics & matchups
- **Model**: GPT-4.1 (tactical decisions)
- **Tools**: Draft Pool MCP tools
- **Use Cases**:
  - Matchup analysis
  - Move recommendations
  - Tera type suggestions
  - Counter-strategy identification

---

## 💡 Use Cases Enabled

### Use Case 1: Live Draft Assistance

**Scenario**: Coach is drafting and needs help

**Agent Capabilities**:
- ✅ Real-time pick recommendations
- ✅ Budget tracking
- ✅ Value analysis
- ✅ Team needs analysis

**API**: `POST /api/ai/draft-assistant`

**Example Flow**:
1. Coach selects team
2. Agent analyzes current roster
3. Agent checks available Pokémon
4. Agent suggests optimal picks
5. Coach makes informed decision

---

### Use Case 2: Trade Evaluation

**Scenario**: Coach receives trade proposal

**Agent Capabilities**:
- ✅ Analyze both teams
- ✅ Evaluate Pokémon values
- ✅ Consider team needs
- ✅ Calculate impact

**API**: `POST /api/ai/free-agency` (action: "trade")

**Example Flow**:
1. Coach inputs trade proposal
2. Agent gets both team rosters
3. Agent analyzes Pokémon values
4. Agent evaluates fit
5. Agent provides recommendation

---

### Use Case 3: Matchup Analysis

**Scenario**: Coach preparing for battle

**Agent Capabilities**:
- ✅ Analyze team matchups
- ✅ Identify advantages
- ✅ Suggest strategies
- ✅ Recommend leads

**API**: `POST /api/ai/battle-strategy` (action: "matchup")

**Example Flow**:
1. Coach selects opponent
2. Agent analyzes both rosters
3. Agent identifies key matchups
4. Agent suggests strategies
5. Coach prepares battle plan

---

### Use Case 4: Free Agency Target Search

**Scenario**: Coach looking for roster improvements

**Agent Capabilities**:
- ✅ Identify team weaknesses
- ✅ Find available targets
- ✅ Evaluate fit
- ✅ Prioritize recommendations

**API**: `POST /api/ai/free-agency` (action: "suggest")

**Example Flow**:
1. Coach requests suggestions
2. Agent analyzes team needs
3. Agent queries available Pokémon
4. Agent evaluates fit
5. Agent provides prioritized list

---

## 🔄 Integration with Existing Features

### With Responses API

**Current State**: Responses API partially implemented

**With Agents SDK**:
- ✅ Agents can use Responses API internally
- ✅ MCP tools work with both
- ✅ Can combine approaches

**Example**: Agent uses Responses API for web search, then MCP for league data

---

### With Existing AI Endpoints

**Current Endpoints**:
- `/api/ai/pokedex` - Pokédex Q&A
- `/api/ai/coach` - Strategic coaching
- `/api/ai/weekly-recap` - Weekly recaps
- `/api/ai/parse-result` - Result parsing

**New Agent Endpoints**:
- `/api/ai/draft-assistant` - Draft help
- `/api/ai/free-agency` - Free agency help
- `/api/ai/battle-strategy` - Battle help

**Complementary**:
- ✅ Agents for complex multi-step tasks
- ✅ Direct API for simple queries
- ✅ Can use both together

---

### With MCP Servers

**Current MCP Servers**:
- ✅ Draft Pool MCP (5 tools)
- ✅ Supabase Local MCP
- ✅ Supabase Remote MCP

**Agent Integration**:
- ✅ Agents use Draft Pool MCP automatically
- ✅ Can add more MCP servers
- ✅ Tool discovery automatic

**Future**: Add Battle Strategy MCP, Showdown MCP

---

## 📊 Comparison: Agents vs. Direct API

### When to Use Agents SDK

**✅ Use Agents When**:
- Complex multi-step reasoning needed
- Multiple tool calls required
- Conversation context important
- Error recovery needed
- Streaming responses desired

**Examples**:
- Draft pick recommendations
- Trade evaluations
- Matchup analysis
- Strategic planning

---

### When to Use Direct API

**✅ Use Direct API When**:
- Simple single-step queries
- Direct function calling sufficient
- No conversation context needed
- Performance-critical paths
- Simple tool calls

**Examples**:
- Pokédex lookups
- SQL generation
- Result parsing
- Quick summaries

---

## 🎨 Frontend Integration Examples

### Draft Assistant UI

```typescript
// components/draft/draft-assistant.tsx
'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'

export function DraftAssistant({ teamId }: { teamId: string }) {
  const [loading, setLoading] = useState(false)
  const [recommendation, setRecommendation] = useState<string>('')

  const getRecommendation = async () => {
    setLoading(true)
    const res = await fetch('/api/ai/draft-assistant', {
      method: 'POST',
      body: JSON.stringify({
        teamId,
        action: 'recommendation',
      }),
    })
    const data = await res.json()
    setRecommendation(data.recommendation.finalOutput)
    setLoading(false)
  }

  return (
    <div>
      <Button onClick={getRecommendation} disabled={loading}>
        {loading ? 'Analyzing...' : 'Get Draft Recommendation'}
      </Button>
      {recommendation && <div>{recommendation}</div>}
    </div>
  )
}
```

### Free Agency Evaluator

```typescript
// components/free-agency/evaluator.tsx
export async function evaluateTarget(teamId: string, pokemonName: string) {
  const res = await fetch('/api/ai/free-agency', {
    method: 'POST',
    body: JSON.stringify({
      teamId,
      action: 'evaluate',
      pokemonName,
    }),
  })
  return res.json()
}
```

---

## 🚧 Limitations & Future Enhancements

### Current Limitations

1. **No Conversation Persistence**
   - Each request is independent
   - No follow-up context
   - **Future**: Add conversation history

2. **Single Agent Per Request**
   - No agent orchestration
   - No agent handoffs
   - **Future**: Multi-agent workflows

3. **No Streaming**
   - Responses wait for completion
   - No real-time updates
   - **Future**: Streaming support

4. **Limited MCP Servers**
   - Only Draft Pool MCP integrated
   - **Future**: Add Battle Strategy MCP, Showdown MCP

---

### Future Enhancements

1. **Multi-Agent Orchestration**
   - Triage agent routes to specialists
   - Agent-to-agent handoffs
   - Parallel execution

2. **Conversation History**
   - Persist conversations
   - Context-aware follow-ups
   - Multi-turn interactions

3. **Streaming Responses**
   - Real-time updates
   - Better UX
   - Progress indicators

4. **Custom Tools**
   - Add more MCP servers
   - Integrate Showdown API
   - Web search capabilities

---

## ✅ Summary

**What We Can Do Now**:

1. ✅ **Draft Assistance**
   - Real-time pick recommendations
   - Budget-aware suggestions
   - Value analysis

2. ✅ **Free Agency Support**
   - Target evaluation
   - Trade analysis
   - Roster gap identification

3. ✅ **Battle Strategy**
   - Matchup analysis
   - Move recommendations
   - Tera type suggestions

**What We Need**:
- ⚠️ Install packages: `npm install @openai/agents @modelcontextprotocol/typescript-sdk`
- ⚠️ Test agent endpoints
- ⚠️ Integrate into frontend

**What's Next**:
- ⏳ Add conversation history
- ⏳ Implement streaming
- ⏳ Add more MCP servers
- ⏳ Multi-agent orchestration

---

**Status**: ✅ **READY FOR USE** (packages installed ✅)

---

**Document Created**: January 17, 2026  
**Last Updated**: January 17, 2026
