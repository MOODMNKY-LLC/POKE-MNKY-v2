# Agents SDK - Quick Start Guide

**Quick reference for using Agents SDK in POKE-MNKY-v2**

---

## 🚀 Quick Test

```bash
# 1. Verify packages installed
pnpm list @openai/agents @modelcontextprotocol/sdk

# 2. Run validation script
pnpm tsx scripts/test-agents-setup.ts

# 3. Test API route (requires auth)
curl -X POST http://localhost:3000/api/ai/draft-assistant \
  -H "Content-Type: application/json" \
  -d '{"teamId": "test-id", "action": "recommendation"}'
```

---

## 📝 Usage Examples

### Draft Assistant

```typescript
// In your component
import { useDraftAssistant } from '@/hooks/use-draft-assistant'

const { getRecommendation, loading, recommendation } = useDraftAssistant()

// Get full recommendation
await getRecommendation({
  teamId: 'team-uuid',
  context: 'Need a water type',
})

// Quick pick suggestion
await suggestPick('team-uuid', 45, [15, 20])
```

### Free Agency Agent

```typescript
// Evaluate target
const res = await fetch('/api/ai/free-agency', {
  method: 'POST',
  body: JSON.stringify({
    teamId: 'team-uuid',
    action: 'evaluate',
    pokemonName: 'Blastoise',
  }),
})

// Evaluate trade
const res = await fetch('/api/ai/free-agency', {
  method: 'POST',
  body: JSON.stringify({
    teamId: 'team-uuid',
    action: 'trade',
    proposedTrade: {
      giving: ['Pikachu'],
      receiving: ['Blastoise'],
    },
  }),
})
```

### Battle Strategy

```typescript
// Matchup analysis
const res = await fetch('/api/ai/battle-strategy', {
  method: 'POST',
  body: JSON.stringify({
    action: 'matchup',
    team1Id: 'team-1-id',
    team2Id: 'team-2-id',
  }),
})
```

---

## 🔍 Troubleshooting

**MCP Connection Fails**:
```bash
# Check server is running
curl http://localhost:3001/health
```

**Import Errors**:
```typescript
// Correct import:
import { Agent, run, MCPServerStreamableHttp } from '@openai/agents'
```

**Empty Responses**:
- Check team ID exists
- Verify OpenAI API key
- Check MCP server logs

---

## 📚 Full Documentation

- **Complete Walkthrough**: `docs/AGENTS-SDK-WALKTHROUGH.md`
- **Installation Guide**: `docs/AGENTS-SDK-INSTALLATION-GUIDE.md`
- **Capabilities**: `docs/AGENTS-SDK-CAPABILITIES.md`

---

**Last Updated**: January 17, 2026
