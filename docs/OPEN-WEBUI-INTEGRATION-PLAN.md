# Open WebUI Integration Plan for POKE MNKY

**Date**: January 17, 2026  
**Status**: Comprehensive Integration Plan  
**Purpose**: Integrate Open WebUI for cost optimization, RAG capabilities, and unified LLM management

---

## Executive Summary

This document outlines a comprehensive plan to integrate Open WebUI into the POKE MNKY ecosystem. Open WebUI provides OpenAI-compatible API endpoints, RAG (Retrieval-Augmented Generation) capabilities, and unified model management. This integration will enable cost optimization through Ollama models, enhanced context through knowledge bases, and improved AI agent recommendations.

**Key Benefits:**
- **30-50% cost reduction** on simple tasks via Ollama models
- **Enhanced context** through RAG knowledge bases (league rules, battle logs, team compositions)
- **Unified interface** for multiple LLM providers (OpenAI, Ollama, others)
- **Better recommendations** through context-aware AI agents

**Strategy**: Hybrid approach - Keep OpenAI for complex tasks, use Open WebUI for cost optimization and RAG capabilities.

---

## Table of Contents

1. [Current State Analysis](#current-state-analysis)
2. [Open WebUI Capabilities](#open-webui-capabilities)
3. [Integration Architecture](#integration-architecture)
4. [Use Cases (Ecosystem-Aware)](#use-cases-ecosystem-aware)
5. [Implementation Phases](#implementation-phases)
6. [Technical Implementation](#technical-implementation)
7. [Risk Assessment](#risk-assessment)
8. [Success Metrics](#success-metrics)

---

## Current State Analysis

### Existing OpenAI Integration

**Current Implementation:**
- **6 API Routes** using OpenAI:
  - `/api/ai/pokedex` - Pokédex Q&A with function calling
  - `/api/ai/weekly-recap` - Weekly recap generation
  - `/api/ai/coach` - Strategic team analysis
  - `/api/ai/parse-result` - Match result parsing
  - `/api/ai/sql` - Natural language → SQL queries
  - `/api/ai/battle-strategy` - Battle tactics

- **3 AI Agents** (Agents SDK):
  - Draft Assistant Agent (`lib/agents/draft-assistant.ts`)
  - Free Agency Agent (`lib/agents/free-agency-agent.ts`)
  - Battle Strategy Agent (`lib/agents/battle-strategy-agent.ts`)

- **Models in Use:**
  - GPT-4.1 (POKEDEX_QA, BATTLE_CHOICE, RESULT_PARSER)
  - GPT-5.2 (STRATEGY_COACH, WEEKLY_RECAP, DISPUTE_RESOLUTION)
  - GPT-5-mini (QUICK_SUMMARY, DISCORD_REPLY)

- **MCP Servers:**
  - Draft Pool MCP Server (5 tools)
  - Supabase Local/Remote MCP
  - Sequential Thinking MCP
  - Web Search MCPs (Brave, Tavily)

**Limitations:**
- All calls go to OpenAI (paid API)
- No RAG capabilities for unstructured context
- Limited cost optimization options
- No unified model management interface

### Data Available for RAG

**League Rules:**
- Stored in `league_config` table (Supabase)
- Documented in `docs/LEAGUE-RULES.md`
- AI context in `.cursor/rules/league-rules.mdc`

**Battle Data:**
- `battle_sessions` table - Battle state and metadata
- `battle_events` table - Turn-by-turn logs (JSONB)
- `replays` table - Showdown replay URLs and parsed data
- `matches` table - Match results and metadata
- MinIO `battle-replays` bucket - .log files

**Team Data:**
- `team_rosters` table - Team compositions
- `draft_budgets` table - Point tracking
- `trade_listings` table - Trade history

---

## Open WebUI Capabilities

### 1. OpenAI-Compatible API

**Endpoint**: `/api/v1/chat/completions`

- Drop-in replacement for OpenAI API
- Supports all OpenAI models (GPT-4, GPT-5, etc.)
- Same request/response format
- Can proxy to OpenAI or use local models

### 2. Ollama API Proxy

**Endpoint**: `/ollama/api/*`

- Transparent passthrough to Ollama
- Supports local models (llama3.2, mistral, etc.)
- Free for local models (no API costs)
- Good for simple tasks

### 3. RAG (Retrieval-Augmented Generation)

**Features:**
- File uploads with automatic content extraction
- Knowledge base collections
- Vector database for semantic search
- Query knowledge bases in chat completions

**Workflow:**
1. Upload files (PDF, markdown, text, etc.)
2. Wait for processing (content extraction + embeddings)
3. Add files to knowledge base collections
4. Query knowledge base in chat completions

### 4. Model Management

- Unified interface for multiple providers
- Easy model switching
- Cost tracking and analytics
- Request logging

---

## Integration Architecture

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    POKE MNKY Next.js App                     │
│                                                               │
│  ┌──────────────────┐      ┌──────────────────┐           │
│  │  OpenAI Client   │      │ Open WebUI Client │           │
│  │   (Complex)      │      │   (Simple/RAG)   │           │
│  └────────┬─────────┘      └────────┬─────────┘           │
│           │                          │                       │
│           │                          │                       │
└───────────┼──────────────────────────┼───────────────────────┘
            │                          │
            │                          │
    ┌───────▼────────┐        ┌───────▼────────┐
    │   OpenAI API   │        │  Open WebUI    │
    │   (Cloud)      │        │  (Server)      │
    └────────────────┘        └───────┬────────┘
                                       │
                            ┌──────────┼──────────┐
                            │          │          │
                    ┌───────▼──┐ ┌────▼────┐ ┌───▼────┐
                    │  OpenAI  │ │ Ollama  │ │  RAG   │
                    │  Proxy   │ │ Models  │ │  KBs   │
                    └──────────┘ └─────────┘ └────────┘
```

### Routing Logic

```typescript
// lib/ai-router.ts
export async function routeAIRequest(
  task: string,
  complexity: 'simple' | 'complex',
  needsRAG: boolean = false
) {
  // Use Open WebUI for:
  // 1. Simple tasks (cost optimization)
  // 2. RAG-enhanced queries
  
  if (needsRAG) {
    return openWebUIClient.chatCompletions({
      model: 'gpt-5.2',
      messages: [...],
      files: [{type: 'collection', id: 'league-rules-kb'}]
    })
  }
  
  if (complexity === 'simple' && process.env.USE_OLLAMA === 'true') {
    return openWebUIClient.chatCompletions({
      model: 'llama3.2', // Ollama model via proxy
      messages: [...]
    })
  }
  
  // Use OpenAI for complex tasks
  return openai.chat.completions.create({
    model: AI_MODELS[task],
    messages: [...]
  })
}
```

---

## Use Cases (Ecosystem-Aware)

### Use Case 1: Cost-Optimized Discord Bot Replies ⭐⭐⭐⭐⭐

**Current State:**
- GPT-5-mini via OpenAI API
- Cost: ~$0.15 per 1M tokens
- Volume: 100+ messages/day
- Monthly cost: ~$50-100

**With Open WebUI:**
- Route to Ollama llama3.2 via Open WebUI proxy
- Cost: Free (local model)
- Quality: Suitable for simple replies
- Monthly savings: ~$50-100

**Implementation:**
```typescript
// lib/discord-bot.ts
async function handleDiscordMessage(message: string) {
  // Simple task → Use Ollama via Open WebUI
  if (isSimpleReply(message)) {
    return openWebUIClient.chatCompletions({
      model: 'llama3.2',
      messages: [{role: 'user', content: message}]
    })
  }
  
  // Complex task → Use OpenAI
  return openai.chat.completions.create({
    model: AI_MODELS.DISCORD_REPLY,
    messages: [{role: 'user', content: message}]
  })
}
```

**Ecosystem Integration:**
- Discord Bot (server 10.3.0.119)
- Routes simple replies to Open WebUI
- Keeps complex tasks on OpenAI
- No changes to Discord bot API

---

### Use Case 2: RAG-Enhanced Draft Assistant ⭐⭐⭐⭐⭐

**Current State:**
- Uses MCP tools for draft pool data
- No access to league rules context
- Recommendations may violate league rules

**With Open WebUI:**
- Upload league rules to knowledge base
- Query knowledge base in draft recommendations
- Ensure recommendations respect league-specific rules

**Knowledge Base Content:**
- League rules document (`docs/LEAGUE-RULES.md`)
- Point system rules
- Banned sets and moves
- Draft format rules

**Implementation:**
```typescript
// lib/agents/draft-assistant.ts
export async function getDraftRecommendation(input: DraftRecommendationInput) {
  // Use Open WebUI with RAG for league rules context
  const response = await openWebUIClient.chatCompletions({
    model: 'gpt-5.2',
    messages: [{
      role: 'user',
      content: `Team ${input.teamId} needs draft recommendations. 
                Check league rules for constraints.`
    }],
    files: [
      {type: 'collection', id: 'league-rules-kb'} // RAG context
    ]
  })
  
  // Also use MCP tools for draft pool data
  const draftPool = await mcpClient.callTool('get_available_pokemon', {...})
  
  // Combine RAG context + MCP data for recommendations
  return combineRecommendations(response, draftPool)
}
```

**Ecosystem Integration:**
- Draft Assistant Agent (`lib/agents/draft-assistant.ts`)
- MCP Draft Pool Server (keeps structured data access)
- Open WebUI RAG (adds unstructured context)
- Supabase `league_config` table (source of rules)

**Benefits:**
- Recommendations respect league rules
- Context-aware suggestions
- Better compliance with league regulations

---

### Use Case 3: Historical Battle Strategy ⭐⭐⭐⭐

**Current State:**
- Battle strategy based on current team data
- No historical context
- Can't learn from past battles

**With Open WebUI:**
- Upload battle logs to knowledge base
- Reference similar past battles
- Learn from successful strategies

**Knowledge Base Content:**
- Battle logs from `battle_events` table
- Replay data from `replays` table
- Match results with team compositions
- Successful strategies and counters

**Implementation:**
```typescript
// lib/agents/battle-strategy-agent.ts
export async function getBattleStrategy(
  teamId: string,
  opponentTeamId: string
) {
  // Use Open WebUI with RAG for historical battle context
  const response = await openWebUIClient.chatCompletions({
    model: 'gpt-5.2',
    messages: [{
      role: 'user',
      content: `Team ${teamId} vs Team ${opponentTeamId}. 
                Analyze similar past battles and suggest strategy.`
    }],
    files: [
      {type: 'collection', id: 'battle-logs-kb'} // Historical context
    ]
  })
  
  return response
}
```

**Ecosystem Integration:**
- Battle Strategy Agent (`lib/agents/battle-strategy-agent.ts`)
- `battle_events` table (source of battle logs)
- `replays` table (source of replay data)
- MinIO `battle-replays` bucket (source of .log files)

**Benefits:**
- Learn from past battles
- Reference similar matchups
- Context-aware move recommendations

---

### Use Case 4: League Meta Analysis ⭐⭐⭐⭐

**Current State:**
- Free agency suggestions based on current data
- No understanding of league meta
- Can't suggest picks that fit league playstyle

**With Open WebUI:**
- Upload team composition histories
- Upload trade patterns
- Analyze league meta trends

**Knowledge Base Content:**
- Team compositions from `team_rosters`
- Trade history from `trade_listings`
- Match results with team data
- Meta trends and patterns

**Implementation:**
```typescript
// lib/agents/free-agency-agent.ts
export async function suggestFreeAgencyTargets(teamId: string) {
  // Use Open WebUI with RAG for league meta context
  const response = await openWebUIClient.chatCompletions({
    model: 'gpt-5.2',
    messages: [{
      role: 'user',
      content: `Team ${teamId} needs free agency targets. 
                Analyze league meta and suggest picks that fit.`
    }],
    files: [
      {type: 'collection', id: 'team-compositions-kb'} // Meta context
    ]
  })
  
  return response
}
```

**Ecosystem Integration:**
- Free Agency Agent (`lib/agents/free-agency-agent.ts`)
- `team_rosters` table (source of team compositions)
- `trade_listings` table (source of trade history)
- `matches` table (source of match results)

**Benefits:**
- Understand league meta
- Suggest picks that fit league playstyle
- Context-aware free agency recommendations

---

### Use Case 5: Weekly Recap Enhancement ⭐⭐⭐

**Current State:**
- Weekly recap based on current week data
- No reference to past weeks
- Limited historical context

**With Open WebUI:**
- Upload past weekly recaps
- Reference historical trends
- Compare current week to past weeks

**Knowledge Base Content:**
- Past weekly recaps
- Historical standings changes
- MVP race trends
- Storyline evolution

**Implementation:**
```typescript
// app/api/ai/weekly-recap/route.ts
export async function POST(request: Request) {
  const { weekData } = await request.json()
  
  // Use Open WebUI with RAG for historical context
  const response = await openWebUIClient.chatCompletions({
    model: 'gpt-5.2',
    messages: [{
      role: 'user',
      content: `Generate weekly recap for Week ${weekData.week}. 
                Reference past weeks for context and trends.`
    }],
    files: [
      {type: 'collection', id: 'weekly-recaps-kb'} // Historical context
    ]
  })
  
  return NextResponse.json({ recap: response })
}
```

**Ecosystem Integration:**
- Weekly Recap API (`app/api/ai/weekly-recap/route.ts`)
- `matches` table (source of match data)
- `standings` table (source of standings data)
- Past recap storage (new feature)

**Benefits:**
- Historical context in recaps
- Trend analysis
- Better storytelling

---

## Implementation Phases

### Phase 1: Setup & Infrastructure (Week 1)

**Tasks:**
1. Deploy Open WebUI Docker service on server (10.3.0.119)
2. Configure OpenAI connection in Open WebUI
3. Configure Ollama connection (if using local models)
4. Create Open WebUI client wrapper in Next.js
5. Add environment variables:
   - `OPEN_WEBUI_URL` (e.g., `http://10.3.0.119:3000`)
   - `OPEN_WEBUI_API_KEY`
   - `USE_OLLAMA` (feature flag)

**Deliverables:**
- Open WebUI running on server
- Client wrapper (`lib/openwebui-client.ts`)
- Environment variables configured
- Basic API test successful

**Files to Create:**
- `lib/openwebui-client.ts` - Open WebUI client wrapper
- `lib/ai-router.ts` - Routing logic for OpenAI vs Open WebUI
- `docker-compose.yml` (update) - Add Open WebUI service

---

### Phase 2: RAG Knowledge Bases (Week 2)

**Tasks:**
1. Export league rules to markdown format
2. Upload league rules to Open WebUI knowledge base
3. Export historical battle logs to text format
4. Upload battle logs to Open WebUI knowledge base
5. Export team compositions to structured format
6. Upload team compositions to Open WebUI knowledge base
7. Test RAG queries with knowledge bases

**Deliverables:**
- 3 knowledge bases created:
  - `league-rules-kb` - League rules and regulations
  - `battle-logs-kb` - Historical battle logs
  - `team-compositions-kb` - Team compositions and meta
- RAG queries working
- Documentation for knowledge base management

**Files to Create:**
- `scripts/export-league-rules.ts` - Export rules to markdown
- `scripts/export-battle-logs.ts` - Export battle logs to text
- `scripts/export-team-compositions.ts` - Export team data
- `scripts/upload-to-openwebui.ts` - Upload files to Open WebUI
- `docs/KNOWLEDGE-BASE-MANAGEMENT.md` - Knowledge base docs

---

### Phase 3: Cost Optimization (Week 3)

**Tasks:**
1. Identify simple tasks (Discord replies, quick summaries)
2. Implement routing logic for OpenAI vs Open WebUI
3. Route simple tasks to Ollama via Open WebUI
4. Monitor cost savings
5. Adjust routing logic based on results
6. Add feature flags for gradual rollout

**Deliverables:**
- Routing logic implemented
- Simple tasks routed to Ollama
- Cost tracking dashboard
- 30-50% cost reduction achieved

**Files to Update:**
- `lib/ai-router.ts` - Add routing logic
- `lib/discord-bot.ts` - Route simple replies to Open WebUI
- `app/api/ai/quick-summary/route.ts` - Route to Open WebUI
- `docs/COST-OPTIMIZATION.md` - Cost tracking docs

---

### Phase 4: Enhanced Agents (Week 4)

**Tasks:**
1. Update draft assistant to use RAG knowledge base
2. Update battle strategy agent with battle logs context
3. Update free agency agent with team composition context
4. Test and validate improvements
5. Monitor response quality
6. Optimize knowledge base queries

**Deliverables:**
- All 3 agents enhanced with RAG
- Improved recommendations validated
- Response quality maintained or improved
- Documentation updated

**Files to Update:**
- `lib/agents/draft-assistant.ts` - Add RAG queries
- `lib/agents/battle-strategy-agent.ts` - Add battle logs RAG
- `lib/agents/free-agency-agent.ts` - Add team compositions RAG
- `docs/AGENTS-SDK-CAPABILITIES.md` - Update with RAG info

---

## Technical Implementation

### Open WebUI Client Wrapper

```typescript
// lib/openwebui-client.ts
import { env } from '@/env'

export class OpenWebUIClient {
  private baseUrl: string
  private apiKey: string

  constructor() {
    this.baseUrl = env.OPEN_WEBUI_URL || 'http://localhost:3000'
    this.apiKey = env.OPEN_WEBUI_API_KEY || ''
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`
    const headers = {
      'Authorization': `Bearer ${this.apiKey}`,
      'Content-Type': 'application/json',
      ...options.headers,
    }

    const response = await fetch(url, {
      ...options,
      headers,
    })

    if (!response.ok) {
      throw new Error(`Open WebUI API error: ${response.statusText}`)
    }

    return response.json()
  }

  // Chat completions (OpenAI-compatible)
  async chatCompletions(params: {
    model: string
    messages: Array<{
      role: 'system' | 'user' | 'assistant'
      content: string
    }>
    files?: Array<{
      type: 'file' | 'collection'
      id: string
    }>
    temperature?: number
    max_tokens?: number
  }) {
    return this.request('/api/v1/chat/completions', {
      method: 'POST',
      body: JSON.stringify(params),
    })
  }

  // Upload file
  async uploadFile(file: Buffer, filename: string, options?: {
    process?: boolean
    process_in_background?: boolean
  }) {
    const formData = new FormData()
    formData.append('file', new Blob([file]), filename)

    const params = new URLSearchParams()
    if (options?.process !== undefined) {
      params.append('process', options.process.toString())
    }
    if (options?.process_in_background !== undefined) {
      params.append('process_in_background', options.process_in_background.toString())
    }

    const url = `${this.baseUrl}/api/v1/files/?${params.toString()}`
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
      },
      body: formData,
    })

    if (!response.ok) {
      throw new Error(`File upload error: ${response.statusText}`)
    }

    return response.json()
  }

  // Check file processing status
  async getFileProcessingStatus(fileId: string) {
    return this.request<{
      status: 'pending' | 'completed' | 'failed'
      error?: string
    }>(`/api/v1/files/${fileId}/process/status`)
  }

  // Add file to knowledge base
  async addFileToKnowledgeBase(knowledgeId: string, fileId: string) {
    return this.request(`/api/v1/knowledge/${knowledgeId}/file/add`, {
      method: 'POST',
      body: JSON.stringify({ file_id: fileId }),
    })
  }

  // Create knowledge base
  async createKnowledgeBase(name: string, description?: string) {
    return this.request('/api/v1/knowledge', {
      method: 'POST',
      body: JSON.stringify({
        name,
        description,
      }),
    })
  }

  // List knowledge bases
  async listKnowledgeBases() {
    return this.request<Array<{
      id: string
      name: string
      description?: string
    }>>('/api/v1/knowledge')
  }
}

export const openWebUIClient = new OpenWebUIClient()
```

### AI Router

```typescript
// lib/ai-router.ts
import { openai, AI_MODELS } from './openai-client'
import { openWebUIClient } from './openwebui-client'
import { env } from '@/env'

export type TaskComplexity = 'simple' | 'complex'
export type TaskType = 
  | 'discord_reply'
  | 'quick_summary'
  | 'draft_assistant'
  | 'battle_strategy'
  | 'free_agency'
  | 'weekly_recap'
  | 'pokedex_qa'
  | 'parse_result'

export interface RouteAIRequestParams {
  task: TaskType
  complexity: TaskComplexity
  messages: Array<{
    role: 'system' | 'user' | 'assistant'
    content: string
  }>
  needsRAG?: boolean
  knowledgeBaseId?: string
  temperature?: number
  max_tokens?: number
}

export async function routeAIRequest(params: RouteAIRequestParams) {
  const {
    task,
    complexity,
    messages,
    needsRAG = false,
    knowledgeBaseId,
    temperature,
    max_tokens,
  } = params

  // Use Open WebUI for:
  // 1. RAG-enhanced queries
  // 2. Simple tasks (if Ollama enabled)
  
  if (needsRAG && knowledgeBaseId) {
    return openWebUIClient.chatCompletions({
      model: AI_MODELS[task] || 'gpt-5.2',
      messages,
      files: [{type: 'collection', id: knowledgeBaseId}],
      temperature,
      max_tokens,
    })
  }

  // Simple tasks → Use Ollama via Open WebUI (if enabled)
  if (
    complexity === 'simple' &&
    env.USE_OLLAMA === 'true' &&
    (task === 'discord_reply' || task === 'quick_summary')
  ) {
    return openWebUIClient.chatCompletions({
      model: 'llama3.2', // Ollama model via proxy
      messages,
      temperature: temperature || 0.7,
      max_tokens: max_tokens || 500,
    })
  }

  // Complex tasks → Use OpenAI directly
  return openai.chat.completions.create({
    model: AI_MODELS[task] || 'gpt-4.1',
    messages,
    temperature,
    max_tokens,
  })
}
```

### Knowledge Base Setup Script

```typescript
// scripts/setup-openwebui-knowledge-bases.ts
import { openWebUIClient } from '@/lib/openwebui-client'
import { readFileSync } from 'fs'
import { join } from 'path'

async function setupKnowledgeBases() {
  console.log('🚀 Setting up Open WebUI knowledge bases...\n')

  // 1. Create knowledge bases
  const leagueRulesKB = await openWebUIClient.createKnowledgeBase(
    'league-rules-kb',
    'League rules and regulations for POKE MNKY'
  )
  console.log(`✅ Created: ${leagueRulesKB.name} (${leagueRulesKB.id})`)

  const battleLogsKB = await openWebUIClient.createKnowledgeBase(
    'battle-logs-kb',
    'Historical battle logs and replay data'
  )
  console.log(`✅ Created: ${battleLogsKB.name} (${battleLogsKB.id})`)

  const teamCompositionsKB = await openWebUIClient.createKnowledgeBase(
    'team-compositions-kb',
    'Team compositions and league meta analysis'
  )
  console.log(`✅ Created: ${teamCompositionsKB.name} (${teamCompositionsKB.id})`)

  // 2. Upload league rules
  const rulesFile = readFileSync(join(process.cwd(), 'docs/LEAGUE-RULES.md'))
  const rulesUpload = await openWebUIClient.uploadFile(
    rulesFile,
    'league-rules.md',
    { process: true, process_in_background: false }
  )
  console.log(`📤 Uploaded: league-rules.md (${rulesUpload.id})`)

  // Wait for processing
  let status = await openWebUIClient.getFileProcessingStatus(rulesUpload.id)
  while (status.status === 'pending') {
    await new Promise(resolve => setTimeout(resolve, 2000))
    status = await openWebUIClient.getFileProcessingStatus(rulesUpload.id)
  }

  if (status.status === 'completed') {
    await openWebUIClient.addFileToKnowledgeBase(leagueRulesKB.id, rulesUpload.id)
    console.log(`✅ Added to knowledge base: league-rules.md`)
  }

  console.log('\n✅ Knowledge bases setup complete!')
}

setupKnowledgeBases().catch(console.error)
```

---

## Risk Assessment

### Risks and Mitigations

**1. Latency**
- **Risk**: Open WebUI adds network hop, increasing latency
- **Mitigation**: 
  - Deploy Open WebUI on same server (10.3.0.119)
  - Use local network (no external calls)
  - Target: <500ms additional overhead
  - Fallback to OpenAI if latency exceeds threshold

**2. Reliability**
- **Risk**: Additional dependency, potential downtime
- **Mitigation**:
  - Keep OpenAI as fallback
  - Graceful degradation (fallback to OpenAI)
  - Health checks and monitoring
  - Feature flags for gradual rollout

**3. Cost**
- **Risk**: Ollama requires GPU resources (if using GPU)
- **Mitigation**:
  - Use CPU-only models for simple tasks
  - Monitor resource usage
  - Scale based on demand
  - Use GPU only if available and cost-effective

**4. Data Privacy**
- **Risk**: Uploading league data to Open WebUI
- **Mitigation**:
  - Self-hosted Open WebUI (private instance)
  - No external data sharing
  - Encrypted storage
  - Access controls

**5. Response Quality**
- **Risk**: Ollama models may have lower quality than OpenAI
- **Mitigation**:
  - Use Ollama only for simple tasks
  - A/B testing to compare quality
  - Fallback to OpenAI if quality degrades
  - Monitor user feedback

---

## Success Metrics

### Cost Optimization
- **Target**: 30-50% cost reduction on simple tasks
- **Measurement**: Compare OpenAI costs before/after
- **Timeline**: 1 month after Phase 3 completion

### Response Quality
- **Target**: Maintain or improve response quality
- **Measurement**: User feedback, A/B testing
- **Timeline**: Ongoing

### Latency
- **Target**: <500ms additional overhead
- **Measurement**: API response time monitoring
- **Timeline**: Ongoing

### Knowledge Base Usage
- **Target**: 80%+ of RAG queries return relevant context
- **Measurement**: Query success rate, relevance scoring
- **Timeline**: 1 month after Phase 4 completion

### Agent Improvements
- **Target**: Improved recommendations (user feedback)
- **Measurement**: User satisfaction surveys
- **Timeline**: 1 month after Phase 4 completion

---

## Next Steps

1. **Review and Approve Plan** - Get stakeholder approval
2. **Set Up Open WebUI** - Deploy Docker service
3. **Create Client Wrapper** - Implement `lib/openwebui-client.ts`
4. **Set Up Knowledge Bases** - Export and upload data
5. **Implement Routing** - Add AI router logic
6. **Test and Validate** - Ensure quality and performance
7. **Monitor and Optimize** - Track metrics and adjust

---

## References

- [Open WebUI API Documentation](https://docs.openwebui.com/getting-started/api-endpoints/)
- [OpenAI-Compatible API Guide](https://docs.openwebui.com/getting-started/quick-start/starting-with-openai-compatible/)
- [RAG Documentation](https://docs.openwebui.com/getting-started/api-endpoints/#retrieval-augmented-generation-rag)
- [Ollama Integration](https://docs.openwebui.com/getting-started/api-endpoints/#ollama-api-proxy-support)

---

**Status**: Ready for Implementation  
**Last Updated**: January 17, 2026
