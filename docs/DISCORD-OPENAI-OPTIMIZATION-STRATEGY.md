# Discord & OpenAI API Optimization Strategy

**Date**: January 17, 2026  
**Status**: Comprehensive Research & Recommendations  
**Purpose**: Maximize OpenAI API efficiency and enhance Discord integration

---

## Executive Summary

This document provides actionable strategies to optimize OpenAI API usage within the POKE MNKY ecosystem and enhance Discord integration using webhooks (including Discohooks) and AI-powered bot features.

**Key Opportunities Identified**:
1. **Discohooks Integration** - Visual webhook builder for rich Discord embeds
2. **OpenAI API Optimization** - Caching, batching, rate limiting, model selection
3. **Discord Bot AI Enhancements** - Smart commands, contextual responses, proactive insights
4. **Webhook Embed Improvements** - Rich formatting, interactive elements, better UX

---

## Part 1: Discohooks Integration

### What is Discohooks?

[Discohooks](https://discohook.app/) is a free, open-source tool for building and testing Discord webhook messages with a visual interface. It allows you to:
- Design rich embeds visually (no JSON editing)
- Preview messages before sending
- Test webhook URLs safely
- Copy embed JSON for programmatic use

**GitHub**: https://github.com/discohook/discohook

### Integration Strategy

#### 1.1 Use Discohooks for Webhook Design

**Current State**: Webhooks use simple text messages (`lib/discord-notifications.ts`)

**Enhancement**: Design rich embeds using Discohooks, then implement programmatically

**Implementation Steps**:

1. **Design Templates in Discohooks**:
   - Match result embeds (with team logos, scores, highlights)
   - Weekly recap embeds (with standings, top performers, stats)
   - Trade proposal embeds (with Pokémon sprites, team info)
   - Draft pick notifications (with Pokémon card-style embeds)
   - Battle reminders (with countdown timers, matchup previews)

2. **Extract JSON from Discohooks**:
   - Use Discohooks' "Copy JSON" feature
   - Store templates in database or config files

3. **Implement Template System**:
   ```typescript
   // lib/discord-webhook-templates.ts
   export const WEBHOOK_TEMPLATES = {
     match_result: {
       embeds: [{
         title: "🏆 Match Result - Week {week}",
         color: 0x00ff00,
         fields: [
           { name: "Winner", value: "{winner}", inline: true },
           { name: "Score", value: "{score}", inline: true },
           { name: "Differential", value: "{differential} KOs", inline: true }
         ],
         thumbnail: { url: "{winner_logo_url}" },
         footer: { text: "Average at Best Battle League" },
         timestamp: "{match_date}"
       }]
     },
     // ... more templates
   }
   ```

4. **Update Webhook Functions**:
   ```typescript
   // lib/discord-notifications.ts
   import { WEBHOOK_TEMPLATES } from './discord-webhook-templates'
   
   export async function notifyMatchResult(matchId: string) {
     // ... fetch match data ...
     
     const embed = WEBHOOK_TEMPLATES.match_result.embeds[0]
     // Replace placeholders with actual data
     const formattedEmbed = formatEmbedTemplate(embed, {
       week: match.week,
       winner: match.winner.name,
       score: `${match.team1_score}-${match.team2_score}`,
       // ... etc
     })
     
     await postWebhook(webhook.webhook_url, {
       embeds: [formattedEmbed]
     })
   }
   ```

#### 1.2 Discohooks Testing Integration

**Add to Admin UI** (`/admin/discord/webhooks`):

- **"Test in Discohooks"** button that:
  1. Opens Discohook.app in new tab
  2. Pre-fills webhook URL
  3. Shows current embed template
  4. Allows visual editing and testing

**Implementation**:
```typescript
// components/discord/webhook-test-button.tsx
export function DiscohooksTestButton({ webhookUrl, template }) {
  const openDiscohooks = () => {
    const discohooksUrl = `https://discohook.app/?data=${encodeURIComponent(
      JSON.stringify({ embeds: [template] })
    )}`
    window.open(discohooksUrl, '_blank')
  }
  
  return <Button onClick={openDiscohooks}>Test in Discohooks</Button>
}
```

#### 1.3 Benefits

- ✅ **Visual Design**: No JSON editing required
- ✅ **Consistent Branding**: Professional embeds across all notifications
- ✅ **Testing**: Preview before deploying
- ✅ **Maintainability**: Easy to update embed designs
- ✅ **User Experience**: Rich, interactive Discord notifications

---

## Part 2: OpenAI API Optimization Strategies

### Current OpenAI Usage

**Existing Endpoints**:
- `/api/ai/weekly-recap` - GPT-5.2 for commissioner-style recaps
- `/api/ai/coach` - GPT-5.2 for strategic team analysis
- `/api/ai/pokedex` - GPT-4.1 with function calling for Pokémon queries
- `/api/ai/parse-result` - GPT-4.1 for parsing Discord match submissions
- `/api/ai/sql` - GPT-4.1 for natural language → SQL queries

**Models Used**:
- GPT-4.1: Structured tasks, function calling, grounded queries
- GPT-5.2: Deep reasoning, content generation, strategic analysis

### Optimization Strategies

#### 2.1 Response Caching

**Problem**: Same queries hit OpenAI API repeatedly (e.g., "What are Pikachu's stats?")

**Solution**: Implement semantic caching for AI responses

**Implementation**:

```typescript
// lib/openai-cache.ts
import { createClient } from '@supabase/supabase-js'

interface CacheEntry {
  query_hash: string
  query_text: string
  response: string
  model: string
  created_at: string
  expires_at: string
}

export async function getCachedResponse(
  query: string,
  model: string,
  ttlHours: number = 24
): Promise<string | null> {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
  
  // Create semantic hash (consider using embeddings for better matching)
  const queryHash = await createQueryHash(query)
  
  const { data } = await supabase
    .from('ai_response_cache')
    .select('*')
    .eq('query_hash', queryHash)
    .eq('model', model)
    .gt('expires_at', new Date().toISOString())
    .single()
  
  return data?.response || null
}

export async function cacheResponse(
  query: string,
  model: string,
  response: string,
  ttlHours: number = 24
) {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
  
  const queryHash = await createQueryHash(query)
  const expiresAt = new Date(Date.now() + ttlHours * 60 * 60 * 1000)
  
  await supabase.from('ai_response_cache').upsert({
    query_hash: queryHash,
    query_text: query,
    response,
    model,
    expires_at: expiresAt.toISOString()
  })
}

// Usage in API routes
export async function POST(request: Request) {
  const { query } = await request.json()
  
  // Check cache first
  const cached = await getCachedResponse(query, AI_MODELS.POKEDEX_QA)
  if (cached) {
    return NextResponse.json({ answer: cached, cached: true })
  }
  
  // Call OpenAI
  const response = await openai.chat.completions.create({...})
  const answer = response.choices[0].message.content
  
  // Cache response
  await cacheResponse(query, AI_MODELS.POKEDEX_QA, answer)
  
  return NextResponse.json({ answer, cached: false })
}
```

**Database Migration**:
```sql
-- supabase/migrations/add_ai_cache_table.sql
CREATE TABLE IF NOT EXISTS ai_response_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  query_hash TEXT NOT NULL,
  query_text TEXT NOT NULL,
  response TEXT NOT NULL,
  model TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL,
  hit_count INTEGER DEFAULT 0
);

CREATE INDEX idx_ai_cache_hash_model ON ai_response_cache(query_hash, model);
CREATE INDEX idx_ai_cache_expires ON ai_response_cache(expires_at);
```

**Cache Hit Rate Goals**:
- Pokédex queries: 60-80% (common questions repeat)
- Weekly recaps: 0% (unique each week, but cache for 7 days)
- Coach advice: 30-50% (similar team questions)
- SQL generation: 40-60% (similar query patterns)

#### 2.2 Request Batching

**Problem**: Multiple small requests waste API calls

**Solution**: Batch similar requests when possible

**Use Cases**:
- Generating multiple team analyses at once
- Processing multiple match result submissions
- Bulk Pokédex lookups

**Implementation**:
```typescript
// lib/openai-batch.ts
export async function batchPokemonQueries(queries: string[]) {
  // Group similar queries
  const grouped = groupSimilarQueries(queries)
  
  const results = await Promise.all(
    grouped.map(async (group) => {
      // Single API call for similar queries
      const response = await openai.chat.completions.create({
        model: AI_MODELS.POKEDEX_QA,
        messages: [{
          role: 'user',
          content: `Answer these related Pokémon questions:\n${group.join('\n')}`
        }]
      })
      return parseBatchResponse(response, group)
    })
  )
  
  return results.flat()
}
```

#### 2.3 Rate Limit Management

**Problem**: Hitting OpenAI rate limits during peak usage

**Solution**: Implement exponential backoff and request queuing

**Implementation**:
```typescript
// lib/openai-rate-limiter.ts
import pLimit from 'p-limit'

// Limit concurrent requests based on tier
const limit = pLimit(process.env.OPENAI_TIER === 'tier1' ? 3 : 10)

export async function rateLimitedOpenAICall<T>(
  fn: () => Promise<T>,
  retries = 3
): Promise<T> {
  return limit(async () => {
    for (let i = 0; i < retries; i++) {
      try {
        return await fn()
      } catch (error: any) {
        if (error.status === 429 && i < retries - 1) {
          // Exponential backoff
          const delay = Math.pow(2, i) * 1000
          await new Promise(resolve => setTimeout(resolve, delay))
          continue
        }
        throw error
      }
    }
    throw new Error('Max retries exceeded')
  })
}

// Usage
const response = await rateLimitedOpenAICall(() =>
  openai.chat.completions.create({...})
)
```

#### 2.4 Model Selection Optimization

**Current Strategy**: Good model selection already implemented

**Enhancements**:

1. **Use GPT-5-mini for Simple Tasks**:
   ```typescript
   // For simple Discord bot replies
   const response = await openai.chat.completions.create({
     model: AI_MODELS.DISCORD_REPLY, // gpt-5-mini
     messages: [{ role: 'user', content: simpleQuery }],
     max_tokens: 100 // Limit tokens for cost savings
   })
   ```

2. **Streaming for Long Responses**:
   ```typescript
   // For weekly recaps (long content)
   const stream = await openai.chat.completions.create({
     model: AI_MODELS.WEEKLY_RECAP,
     messages: [...],
     stream: true
   })
   
   // Stream to Discord webhook as it generates
   for await (const chunk of stream) {
     // Send chunks to Discord progressively
   }
   ```

3. **Token Optimization**:
   - Set `max_tokens` realistically (don't reserve unused tokens)
   - Use `response_format: { type: "json_schema" }` for structured outputs
   - Minimize system prompts (shorter = cheaper)

#### 2.5 Cost Tracking & Monitoring

**Implementation**:
```typescript
// lib/openai-usage-tracker.ts
export async function trackOpenAIUsage(
  model: string,
  tokensUsed: number,
  cost: number
) {
  const supabase = createClient(...)
  
  await supabase.from('openai_usage_log').insert({
    model,
    tokens_used: tokensUsed,
    cost_usd: cost,
    timestamp: new Date().toISOString()
  })
}

// Calculate cost based on model pricing
export function calculateCost(model: string, tokens: number): number {
  const pricing = {
    'gpt-4.1': { input: 0.03, output: 0.06 }, // per 1K tokens
    'gpt-5.2': { input: 0.05, output: 0.15 },
    'gpt-5-mini': { input: 0.001, output: 0.002 }
  }
  
  const rates = pricing[model] || pricing['gpt-4.1']
  // Simplified - would need input/output token split
  return (tokens / 1000) * rates.input
}
```

**Dashboard** (`/admin/openai-usage`):
- Daily/weekly/monthly usage charts
- Cost breakdown by model
- Cache hit rate metrics
- Rate limit hit tracking
- Top queries by frequency

---

## Part 3: Discord Bot AI Enhancements

### Current Bot Features

**Slash Commands**:
- `/matchups` - View weekly schedule
- `/submit` - Submit match results
- `/standings` - Top 10 standings
- `/recap` - Generate AI weekly recap
- `/pokemon` - Pokédex lookup

### Proposed AI Enhancements

#### 3.1 Smart Command Suggestions

**Feature**: Bot proactively suggests relevant commands based on context

**Implementation**:
```typescript
// When user mentions "my team" or "standings"
if (message.content.includes('my team') || message.content.includes('standings')) {
  const suggestion = await openai.chat.completions.create({
    model: AI_MODELS.DISCORD_REPLY,
    messages: [{
      role: 'system',
      content: 'Suggest a relevant Discord command based on user message. Keep it under 50 characters.'
    }, {
      role: 'user',
      content: message.content
    }]
  })
  
  await message.reply({
    content: `💡 Try: ${suggestion.choices[0].message.content}`,
    ephemeral: true
  })
}
```

#### 3.2 Contextual Match Analysis

**New Command**: `/analyze-matchup [team1] [team2]`

**Implementation**:
```typescript
// app/api/discord/analyze-matchup/route.ts
export async function analyzeMatchup(team1Id: string, team2Id: string) {
  // Fetch team rosters, recent matches, stats
  const [team1, team2] = await Promise.all([
    getTeamData(team1Id),
    getTeamData(team2Id)
  ])
  
  // Use GPT-5.2 for deep analysis
  const analysis = await openai.chat.completions.create({
    model: AI_MODELS.STRATEGY_COACH,
    messages: [{
      role: 'system',
      content: 'Analyze Pokémon team matchups. Identify type advantages, key threats, and strategic recommendations.'
    }, {
      role: 'user',
      content: `Team 1: ${JSON.stringify(team1)}\nTeam 2: ${JSON.stringify(team2)}\n\nProvide matchup analysis.`
    }]
  })
  
  return formatMatchupEmbed(analysis, team1, team2)
}
```

#### 3.3 Proactive Insights

**Feature**: Bot sends unsolicited insights based on league activity

**Implementation**:
```typescript
// Scheduled job (cron)
export async function sendProactiveInsights() {
  // Check for interesting patterns
  const insights = await generateInsights()
  
  if (insights.length > 0) {
    for (const insight of insights) {
      await sendDiscordWebhook({
        embeds: [{
          title: "🤖 AI Insight",
          description: insight.text,
          color: 0x5865F2,
          footer: { text: "Powered by GPT-5.2" }
        }]
      })
    }
  }
}

async function generateInsights() {
  // Use GPT-5.2 to analyze league data and find interesting patterns
  const analysis = await openai.chat.completions.create({
    model: AI_MODELS.STRATEGY_COACH,
    messages: [{
      role: 'system',
      content: 'Analyze league data and identify 1-2 interesting insights worth sharing. Be concise.'
    }, {
      role: 'user',
      content: JSON.stringify(leagueData)
    }]
  })
  
  return parseInsights(analysis)
}
```

**Insight Examples**:
- "🔥 Team X is on a 5-game win streak!"
- "⚡ Pikachu has been MVP in 3 of the last 5 matches"
- "🎯 Week 8 has the closest matchups - 4 games within 2 KOs"

#### 3.4 Natural Language Command Processing

**Feature**: Allow natural language instead of strict slash commands

**Implementation**:
```typescript
// Enhanced message handler
client.on('messageCreate', async (message) => {
  if (message.author.bot) return
  
  // Check if message is a natural language command
  const intent = await classifyIntent(message.content)
  
  switch (intent) {
    case 'view_standings':
      await handleStandingsCommand(message)
      break
    case 'submit_result':
      await handleSubmitCommand(message)
      break
    case 'pokemon_query':
      await handlePokemonQuery(message)
      break
  }
})

async function classifyIntent(text: string): Promise<string> {
  const response = await openai.chat.completions.create({
    model: AI_MODELS.DISCORD_REPLY,
    messages: [{
      role: 'system',
      content: 'Classify user intent. Return one word: view_standings, submit_result, pokemon_query, or other.'
    }, {
      role: 'user',
      content: text
    }],
    response_format: { type: "json_schema", json_schema: {...} }
  })
  
  return JSON.parse(response.choices[0].message.content).intent
}
```

#### 3.5 AI-Powered Match Result Parsing Enhancement

**Current**: `/submit` command with manual parsing

**Enhancement**: Auto-detect and parse match results from any message

**Implementation**:
```typescript
// Auto-detect match results in any channel
client.on('messageCreate', async (message) => {
  if (message.author.bot) return
  
  // Check if message looks like a match result
  const isMatchResult = await detectMatchResult(message.content)
  
  if (isMatchResult.confidence > 0.8) {
    // Parse using existing GPT-4.1 parser
    const parsed = await parseMatchResult(message.content)
    
    // Ask for confirmation
    await message.reply({
      embeds: [{
        title: "🏆 Match Result Detected",
        description: `Week ${parsed.week}: ${parsed.team_a} vs ${parsed.team_b}\nWinner: ${parsed.winner}`,
        footer: { text: "React with ✅ to confirm, ❌ to reject" }
      }]
    })
  }
})
```

---

## Part 4: Webhook Embed Improvements

### Current Webhook Implementation

**Simple Text Messages** (`lib/discord-notifications.ts`):
- Match results: Plain text
- Weekly recaps: Plain text
- Trade proposals: Plain text

### Enhanced Embed System

#### 4.1 Rich Match Result Embeds

**Design in Discohooks**, then implement:

```typescript
export const MATCH_RESULT_EMBED = {
  embeds: [{
    title: "🏆 Match Result - Week {week}",
    color: 0x00ff00, // Green for completed
    fields: [
      {
        name: "👥 Matchup",
        value: "**{team1_name}** vs **{team2_name}**",
        inline: false
      },
      {
        name: "📊 Score",
        value: "{team1_score} - {team2_score}",
        inline: true
      },
      {
        name: "🏅 Winner",
        value: "**{winner_name}**",
        inline: true
      },
      {
        name: "⚡ Differential",
        value: "{differential} KOs",
        inline: true
      },
      {
        name: "⭐ Top Performer",
        value: "{top_pokemon} ({kills} KOs)",
        inline: false
      }
    ],
    thumbnail: {
      url: "{winner_logo_url}"
    },
    image: {
      url: "{match_replay_url}" // If available
    },
    footer: {
      text: "Average at Best Battle League",
      icon_url: "{league_logo_url}"
    },
    timestamp: "{match_date}"
  }]
}
```

#### 4.2 Interactive Weekly Recap Embeds

**Features**:
- Collapsible sections (using Discord's embed limits creatively)
- Links to full recap on website
- Standings table as embed fields
- Top performers with Pokémon sprites

```typescript
export const WEEKLY_RECAP_EMBED = {
  embeds: [
    {
      title: "📰 Week {week} Recap",
      description: "{recap_summary}",
      color: 0x5865F2,
      fields: [
        {
          name: "📊 Top 5 Standings",
          value: formatStandingsTable(standings.slice(0, 5)),
          inline: false
        },
        {
          name: "⭐ Top Performers",
          value: formatTopPerformers(topPerformers),
          inline: false
        }
      ],
      footer: {
        text: "Read full recap on the website",
        icon_url: "{league_logo_url}"
      },
      url: "https://poke-mnky.moodmnky.com/insights?week={week}"
    }
  ]
}
```

#### 4.3 Trade Proposal Embeds

**Rich embed with**:
- Pokémon sprites for both sides
- Team information
- Trade value analysis (AI-powered)
- Quick action buttons (if using Discord buttons API)

```typescript
export const TRADE_PROPOSAL_EMBED = {
  embeds: [{
    title: "🔄 New Trade Proposal",
    description: "**{offering_team}** wants to trade with **{receiving_team}**",
    color: 0xFFA500,
    fields: [
      {
        name: "📦 Offering",
        value: formatPokemonList(offeringPokemon),
        inline: true
      },
      {
        name: "📥 Requesting",
        value: formatPokemonList(requestingPokemon),
        inline: true
      },
      {
        name: "💡 AI Trade Analysis",
        value: "{ai_analysis}", // GPT-4.1 analysis
        inline: false
      }
    ],
    footer: {
      text: "View and manage trades on the website"
    },
    url: "https://poke-mnky.moodmnky.com/dashboard/free-agency"
  }]
}
```

#### 4.4 Battle Reminder Embeds

**Proactive notifications**:
- Matchup preview
- Countdown timer
- Team comparison
- AI prediction (optional)

```typescript
export const BATTLE_REMINDER_EMBED = {
  embeds: [{
    title: "⚔️ Battle Reminder",
    description: "Your match is scheduled in **{time_remaining}**",
    color: 0xFF0000,
    fields: [
      {
        name: "👥 Matchup",
        value: "**{your_team}** vs **{opponent_team}**",
        inline: false
      },
      {
        name: "📊 Head-to-Head",
        value: "{your_record} vs {opponent_record}",
        inline: true
      },
      {
        name: "🎯 AI Prediction",
        value: "{prediction_text}", // GPT-5.2 prediction
        inline: true
      }
    ],
    footer: {
      text: "Launch battle: /showdown create-room"
    }
  }]
}
```

---

## Part 5: Implementation Roadmap

### Phase 1: Quick Wins (Week 1-2)

**Priority**: High Impact, Low Effort

1. ✅ **Implement Response Caching**
   - Create `ai_response_cache` table
   - Add caching to Pokédex queries
   - Add caching to coach advice
   - **Expected Savings**: 40-60% reduction in API calls

2. ✅ **Design Webhook Embeds in Discohooks**
   - Match result embeds
   - Weekly recap embeds
   - Trade proposal embeds
   - **Expected Impact**: Professional, branded notifications

3. ✅ **Add Rate Limiting**
   - Implement exponential backoff
   - Add request queuing
   - **Expected Impact**: Zero rate limit errors

### Phase 2: AI Enhancements (Week 3-4)

**Priority**: High Impact, Medium Effort

1. ✅ **Enhanced Discord Bot Commands**
   - `/analyze-matchup` command
   - Natural language command processing
   - Auto-detect match results
   - **Expected Impact**: Better user experience

2. ✅ **Proactive Insights**
   - Scheduled insight generation
   - Pattern detection
   - **Expected Impact**: Increased engagement

3. ✅ **Cost Tracking Dashboard**
   - Usage monitoring
   - Cost breakdown
   - Cache hit rate metrics
   - **Expected Impact**: Better cost control

### Phase 3: Advanced Features (Week 5-6)

**Priority**: Medium Impact, High Effort

1. ✅ **Request Batching**
   - Batch similar queries
   - Group processing
   - **Expected Savings**: 20-30% reduction in API calls

2. ✅ **Streaming Responses**
   - Stream long content to Discord
   - Progressive updates
   - **Expected Impact**: Better UX for long responses

3. ✅ **Semantic Caching**
   - Use embeddings for cache matching
   - Similar query detection
   - **Expected Savings**: Additional 10-20% cache hit rate

---

## Part 6: Cost Optimization Estimates

### Current Usage (Estimated)

**Assumptions**:
- 50 Pokédex queries/day × 30 days = 1,500 calls/month
- 1 Weekly recap/week × 4 weeks = 4 calls/month
- 20 Coach queries/week × 4 weeks = 80 calls/month
- 10 Match result parses/week × 4 weeks = 40 calls/month

**Total**: ~1,624 API calls/month

**Cost Estimate** (GPT-4.1 @ $0.03/1K tokens, avg 500 tokens/call):
- Without optimization: ~$24/month
- With caching (60% hit rate): ~$10/month
- **Savings**: ~$14/month (58% reduction)

### With Enhancements

**New Usage**:
- Proactive insights: +20 calls/month
- Matchup analysis: +40 calls/month
- Natural language processing: +100 calls/month

**Total**: ~1,784 calls/month

**Cost with Optimization**:
- With caching (70% hit rate): ~$16/month
- **Still 33% cheaper than baseline**

---

## Part 7: Technical Implementation Details

### Database Schema Additions

```sql
-- AI Response Cache
CREATE TABLE ai_response_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  query_hash TEXT NOT NULL,
  query_text TEXT NOT NULL,
  response TEXT NOT NULL,
  model TEXT NOT NULL,
  tokens_used INTEGER,
  cost_usd DECIMAL(10, 4),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL,
  hit_count INTEGER DEFAULT 0
);

-- OpenAI Usage Tracking
CREATE TABLE openai_usage_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  endpoint TEXT NOT NULL,
  model TEXT NOT NULL,
  tokens_used INTEGER NOT NULL,
  cost_usd DECIMAL(10, 4) NOT NULL,
  cached BOOLEAN DEFAULT FALSE,
  timestamp TIMESTAMPTZ DEFAULT NOW(),
  user_id UUID REFERENCES auth.users(id)
);

-- Webhook Templates
CREATE TABLE discord_webhook_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT UNIQUE NOT NULL,
  template_json JSONB NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

### Environment Variables

```bash
# OpenAI Optimization
OPENAI_CACHE_ENABLED=true
OPENAI_CACHE_TTL_HOURS=24
OPENAI_RATE_LIMIT_CONCURRENT=10
OPENAI_TIER=tier1

# Discord Webhooks
DISCORD_WEBHOOK_MATCH_RESULTS=https://...
DISCORD_WEBHOOK_WEEKLY_RECAP=https://...
DISCORD_WEBHOOK_TRADES=https://...
DISCORD_WEBHOOK_INSIGHTS=https://...
```

---

## Part 8: Monitoring & Metrics

### Key Metrics to Track

1. **OpenAI API Metrics**:
   - Total API calls/day
   - Cache hit rate %
   - Average response time
   - Cost per day/week/month
   - Rate limit hits
   - Error rate

2. **Discord Bot Metrics**:
   - Command usage frequency
   - Response time
   - User engagement
   - Webhook delivery success rate

3. **Cost Metrics**:
   - Cost per endpoint
   - Cost per user
   - Cost per feature
   - Projected monthly cost

### Dashboard Implementation

**Create** `/admin/openai-analytics`:

- Usage charts (daily/weekly/monthly)
- Cost breakdown by model
- Cache hit rate over time
- Top queries by frequency
- Rate limit incidents
- Cost projections

---

## Conclusion

### Summary of Benefits

1. **Discohooks Integration**:
   - Professional, branded Discord notifications
   - Easy webhook design and testing
   - Consistent user experience

2. **OpenAI Optimization**:
   - 40-60% cost reduction through caching
   - Better rate limit management
   - Improved response times

3. **Discord Bot Enhancements**:
   - More intelligent, contextual responses
   - Proactive insights and notifications
   - Better user engagement

4. **Overall Impact**:
   - **Cost Savings**: ~$14-20/month (58-67% reduction)
   - **User Experience**: Significantly improved
   - **Scalability**: Better prepared for growth

### Next Steps

1. **Immediate** (This Week):
   - Set up Discohooks for webhook design
   - Implement basic response caching
   - Design match result embeds

2. **Short-term** (Next 2 Weeks):
   - Complete webhook embed system
   - Add rate limiting
   - Implement cost tracking

3. **Medium-term** (Next Month):
   - Enhanced Discord bot commands
   - Proactive insights
   - Advanced caching strategies

---

## References

- [Discohooks GitHub](https://github.com/discohook/discohook)
- [Discohooks Website](https://discohook.app/)
- [Discord Webhooks Guide](https://birdie0.github.io/discord-webhooks-guide/)
- [OpenAI API Best Practices](https://platform.openai.com/docs/guides/rate-limits)
- [OpenAI Cost Optimization Strategies](https://www.cloudzero.com/blog/openai-cost-optimization/)

---

**Document Status**: Ready for Implementation  
**Last Updated**: January 17, 2026  
**Next Review**: After Phase 1 completion
