# OpenAI Integration Quick Start Guide

**Quick reference for implementing OpenAI capabilities in POKE-MNKY**

---

## 🚀 Quick Start Checklist

### Phase 1: MCP Servers (Weeks 1-2)

**Step 1: Set up MCP Server Development**
```bash
# On server (10.3.0.119)
cd /home/moodmnky/POKE-MNKY/tools
mkdir -p mcp-servers/draft-pool-server
cd mcp-servers/draft-pool-server
npm init -y
npm install @modelcontextprotocol/sdk @supabase/supabase-js
```

**Step 2: Create Basic MCP Server**
```typescript
// src/index.ts
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const server = new Server({
  name: 'poke-mnky-draft-pool',
  version: '1.0.0',
}, {
  capabilities: {
    tools: {},
  },
});

// Add tools...
```

**Step 3: Add to Docker Compose**
```yaml
# /home/moodmnky/POKE-MNKY/docker-compose.yml
poke-mnky-draft-mcp-server:
  build: ./tools/mcp-servers/draft-pool-server
  environment:
    - SUPABASE_URL=${SUPABASE_URL}
    - SUPABASE_SERVICE_ROLE_KEY=${SUPABASE_SERVICE_ROLE_KEY}
  networks:
    - poke-mnky-network
  restart: unless-stopped
```

**Step 4: Deploy**
```bash
docker-compose up -d poke-mnky-draft-mcp-server
```

---

### Phase 2: Responses API Migration (Weeks 3-4)

**Step 1: Update OpenAI Client**
```typescript
// lib/openai-client.ts
export const responsesClient = {
  create: async (params: any) => {
    return openai.responses.create(params)
  },
}
```

**Step 2: Migrate Endpoint**
```typescript
// app/api/ai/pokedex/route.ts
import { responsesClient } from "@/lib/openai-client"

export async function POST(request: Request) {
  const { query } = await request.json()
  
  const response = await responsesClient.create({
    model: "gpt-4.1",
    input: [{ role: "user", content: query }],
    tools: [{
      type: "mcp",
      server_label: "poke-mnky-draft-pool",
      server_url: process.env.MCP_DRAFT_POOL_SERVER_URL,
    }],
  })
  
  return NextResponse.json({ answer: response.output[0]?.content?.[0]?.text })
}
```

---

### Phase 3: Agents SDK (Weeks 5-6)

**Step 1: Install Agents SDK**
```bash
npm install @openai/agents
```

**Step 2: Create Agent**
```typescript
// lib/agents/draft-assistant.ts
import { Agent, Runner } from '@openai/agents'

export const draftAssistantAgent = new Agent({
  name: "Draft Assistant",
  instructions: "Help coaches make optimal draft picks",
  model: "gpt-5.2",
  tools: [{
    type: "mcp",
    server_label: "poke-mnky-draft-pool",
    server_url: process.env.MCP_DRAFT_POOL_SERVER_URL,
  }],
})

export async function getDraftRecommendation(teamId: string, context: string) {
  const result = await Runner.run(draftAssistantAgent, {
    input: `Team: ${teamId}\nContext: ${context}`,
  })
  return result.final_output
}
```

**Step 3: Create API Endpoint**
```typescript
// app/api/ai/draft-assistant/route.ts
import { getDraftRecommendation } from "@/lib/agents/draft-assistant"

export async function POST(request: Request) {
  const { teamId, context } = await request.json()
  const recommendation = await getDraftRecommendation(teamId, context)
  return NextResponse.json({ recommendation })
}
```

---

## 🔧 Environment Variables

Add to `.env` and Vercel:

```bash
# MCP Servers (use network IP for internal access)
MCP_DRAFT_POOL_SERVER_URL=http://10.3.0.119:3001/mcp
MCP_BATTLE_STRATEGY_SERVER_URL=http://10.3.0.119:3002/mcp
MCP_SHOWDOWN_SERVER_URL=http://10.3.0.119:3003/mcp

# Note: For external access from Vercel, you may need:
# - Cloudflare Tunnel setup
# - VPN/private network connection
# - Reverse proxy with authentication
```

---

## 📚 Key Resources

- **Full Plan**: See `OPENAI-CAPABILITIES-INTEGRATION-PLAN.md`
- **MCP SDK**: https://github.com/modelcontextprotocol/typescript-sdk
- **Agents SDK**: https://openai.github.io/openai-agents-python/
- **Responses API**: https://platform.openai.com/docs/guides/responses

---

## 🎯 Priority Order

1. **Week 1-2**: Draft Pool MCP Server (highest impact)
2. **Week 3**: Responses API migration for Pokédex endpoint
3. **Week 4**: Draft Assistant Agent
4. **Week 5+**: Expand to other agents and features

---

## ⚠️ Important Notes

- MCP servers must be accessible from Vercel (use Cloudflare Tunnel or public IP)
- Test MCP servers locally before deploying
- Monitor OpenAI API costs closely
- Implement caching early to reduce costs

---

**Last Updated**: January 17, 2026
