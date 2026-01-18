# MCP REST Client Usage Examples

**Date**: January 18, 2026  
**Status**: ✅ Production Ready

---

## Overview

The MCP REST Client provides type-safe, direct access to the MCP server's REST API endpoints. This is ideal for non-AI use cases where you need direct data fetching without going through OpenAI SDK.

---

## Basic Usage

### Import the Client

```typescript
import { mcpClient } from "@/lib/mcp-rest-client"
// Or create a custom instance:
import { createMCPClient } from "@/lib/mcp-rest-client"

const customClient = createMCPClient({
  baseUrl: "https://custom-server.com",
  apiKey: "your-api-key",
  enableRetry: true,
  maxRetries: 3,
})
```

### Get Available Pokémon

```typescript
// Simple query
const result = await mcpClient.getAvailablePokemon({ limit: 10 })

console.log(`Found ${result.data.pokemon.length} Pokémon`)
console.log(`Rate limit: ${result.rateLimit?.remaining}/${result.rateLimit?.limit}`)

// With filters
const filtered = await mcpClient.getAvailablePokemon({
  point_range: [15, 20],
  generation: 1,
  type: "electric",
  limit: 50,
})
```

### Get Draft Status

```typescript
const status = await mcpClient.getDraftStatus()

if (status.data.result === "No active draft session found") {
  console.log("No active draft")
} else {
  console.log(`Current pick: ${status.data.current_pick}`)
  console.log(`Round: ${status.data.round}`)
  console.log(`Team turn: ${status.data.team_turn}`)
}
```

### Get Team Budget

```typescript
const budget = await mcpClient.getTeamBudget({
  team_id: 1,
  season_id: 5, // optional
})

console.log(`Total: ${budget.data.total_points}`)
console.log(`Spent: ${budget.data.spent_points}`)
console.log(`Remaining: ${budget.data.remaining_points}`)
```

### Get Team Picks

```typescript
const picks = await mcpClient.getTeamPicks({
  team_id: 1,
  season_id: 5, // optional
})

picks.data.picks.forEach((pick, index) => {
  console.log(`Pick ${index + 1}: ${pick.pokemon_name} (${pick.point_value} pts)`)
})
```

### Get Pokémon Types

```typescript
const types = await mcpClient.getPokemonTypes({
  pokemon_name: "pikachu",
  // or pokemon_id: 25
})

console.log(`Primary: ${types.data.type_primary}`)
console.log(`Secondary: ${types.data.type_secondary}`)
```

### Get Smogon Meta

```typescript
const meta = await mcpClient.getSmogonMeta({
  pokemon_name: "pikachu",
  format: "gen9ou", // optional
})

console.log(`Usage: ${meta.data.usage}%`)
console.log(`Rank: ${meta.data.rank}`)
```

### Get Ability Mechanics

```typescript
const ability = await mcpClient.getAbilityMechanics({
  ability_name: "lightning-rod",
})

console.log(ability.data.description)
console.log(ability.data.mechanics)
```

### Get Move Mechanics

```typescript
const move = await mcpClient.getMoveMechanics({
  move_name: "thunderbolt",
})

console.log(move.data.description)
console.log(move.data.mechanics)
```

### Analyze Pick Value

```typescript
const analysis = await mcpClient.analyzePickValue({
  pokemon_name: "pikachu",
  point_value: 15,
  team_id: 1, // optional
})

console.log(`Value Score: ${analysis.data.value_score}`)
console.log(`Recommendation: ${analysis.data.recommendation}`)
```

---

## Error Handling

```typescript
import { mcpClient, MCPApiError } from "@/lib/mcp-rest-client"

try {
  const result = await mcpClient.getTeamBudget({ team_id: 99999 })
} catch (error) {
  if (error instanceof MCPApiError) {
    console.error(`API Error: ${error.status} ${error.statusText}`)
    console.error(`Code: ${error.code}`)
    console.error(`Details:`, error.details)
    
    // Handle specific errors
    if (error.status === 401) {
      console.error("Authentication failed")
    } else if (error.status === 429) {
      console.error("Rate limit exceeded")
      // Check retryAfter if available
    } else if (error.status === 404) {
      console.error("Resource not found")
    }
  } else {
    console.error("Unexpected error:", error)
  }
}
```

---

## React Component Example

```typescript
'use client'

import { useEffect, useState } from 'react'
import { mcpClient, MCPApiError } from '@/lib/mcp-rest-client'

export function DraftPoolList() {
  const [pokemon, setPokemon] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchPokemon() {
      try {
        setLoading(true)
        const result = await mcpClient.getAvailablePokemon({ limit: 20 })
        setPokemon(result.data.pokemon)
        setError(null)
      } catch (err) {
        if (err instanceof MCPApiError) {
          setError(`API Error: ${err.status} ${err.statusText}`)
        } else {
          setError('Failed to load Pokémon')
        }
      } finally {
        setLoading(false)
      }
    }

    fetchPokemon()
  }, [])

  if (loading) return <div>Loading...</div>
  if (error) return <div>Error: {error}</div>

  return (
    <ul>
      {pokemon.map((p) => (
        <li key={p.pokemon_name}>
          {p.pokemon_name} - {p.point_value} pts
        </li>
      ))}
    </ul>
  )
}
```

---

## Server Component Example (Next.js)

```typescript
import { mcpClient } from '@/lib/mcp-rest-client'

export default async function DraftStatusPage() {
  const status = await mcpClient.getDraftStatus()

  return (
    <div>
      <h1>Draft Status</h1>
      {status.data.result === "No active draft session found" ? (
        <p>No active draft session</p>
      ) : (
        <div>
          <p>Round: {status.data.round}</p>
          <p>Current Pick: {status.data.current_pick}</p>
          <p>Team Turn: {status.data.team_turn}</p>
        </div>
      )}
    </div>
  )
}
```

---

## Rate Limit Handling

```typescript
const result = await mcpClient.getAvailablePokemon({ limit: 10 })

// Check rate limit info
if (result.rateLimit) {
  console.log(`Rate Limit: ${result.rateLimit.remaining}/${result.rateLimit.limit}`)
  console.log(`Resets at: ${new Date(result.rateLimit.reset * 1000)}`)
  
  if (result.rateLimit.remaining < 10) {
    console.warn("Rate limit getting low!")
  }
  
  if (result.rateLimit.retryAfter) {
    console.log(`Retry after: ${result.rateLimit.retryAfter} seconds`)
  }
}
```

---

## Custom Client Configuration

```typescript
import { createMCPClient } from '@/lib/mcp-rest-client'

// Custom configuration
const customClient = createMCPClient({
  baseUrl: "https://custom-server.com",
  apiKey: "custom-api-key",
  enableRetry: true,
  maxRetries: 5, // More retries
  retryDelay: 2000, // Longer delay between retries
})

// Use custom client
const result = await customClient.getAvailablePokemon({ limit: 10 })
```

---

## Comparison: REST vs MCP Protocol

### Use REST API When:
- ✅ Building UI components that need direct data
- ✅ Server-side data fetching (Next.js Server Components)
- ✅ Non-AI use cases (draft board, team rosters, etc.)
- ✅ Need better error handling and retry control
- ✅ Want to avoid OpenAI SDK overhead

### Use MCP Protocol When:
- ✅ AI agent integration (OpenAI Responses API)
- ✅ Natural language queries
- ✅ Complex multi-step operations
- ✅ Need AI to decide which tools to use

---

## Migration Guide

### From Manual Fetch Calls

**Before:**
```typescript
const response = await fetch(`${MCP_API_BASE}/api/get_available_pokemon`, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${API_KEY}`,
  },
  body: JSON.stringify({ limit: 10 }),
})
const data: any = await response.json() // ❌ No type safety
```

**After:**
```typescript
import { mcpClient } from '@/lib/mcp-rest-client'

const result = await mcpClient.getAvailablePokemon({ limit: 10 })
// ✅ Fully typed, error handling, rate limit info
```

---

## Best Practices

1. **Use Default Client**: Use `mcpClient` for most cases
2. **Handle Errors**: Always wrap calls in try-catch
3. **Check Rate Limits**: Monitor rate limit info for production apps
4. **Server Components**: Use REST client in Next.js Server Components
5. **Client Components**: Use REST client with React hooks for client-side
6. **Type Safety**: Leverage TypeScript types for all responses

---

## Performance Tips

- REST API is faster than MCP protocol (no OpenAI SDK overhead)
- Responses are cached on the server (check cache headers)
- Use appropriate `limit` parameters to reduce payload size
- Batch requests when possible
- Monitor rate limits to avoid hitting limits

---

## Troubleshooting

### 401 Unauthorized
- Check API key is set in environment variables
- Verify API key format is correct
- Ensure `Authorization: Bearer` header is being sent

### 429 Rate Limit Exceeded
- Check `rateLimit.retryAfter` for wait time
- Implement exponential backoff
- Reduce request frequency

### Network Errors
- Check base URL is correct
- Verify server is accessible
- Check CORS settings if calling from browser

---

## Additional Resources

- [OpenAPI Specification](./openapi.json)
- [API Documentation](/api-docs)
- [MCP Server Integration Guide](./MCP-SERVER-INTEGRATION-GUIDE.md)
- [Type Definitions](../lib/mcp-api-types.ts)
