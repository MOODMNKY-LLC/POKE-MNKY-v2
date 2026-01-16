# Damage Calculator Integration Guide

**Date**: January 16, 2026  
**Status**: ✅ Calculator Running at `https://aab-calc.moodmnky.com`  
**Server Setup**: ✅ **Complete** - Ready for Next.js integration

---

## 🎯 Integration Options Overview

You have **3 main ways** to integrate the damage calculator:

| Method | Use Case | Latency | Setup | Status | Best For |
|--------|----------|---------|-------|--------|----------|
| **1. Iframe Embed** | Full UI embedding | ~100ms | ✅ Ready | ✅ Available | Next.js pages, standalone access |
| **2. API Endpoint** | Programmatic calls | ~50ms | ⚠️ Optional | ⏳ Not enabled | Discord bot, server-side calculations |
| **3. npm Package** | Client-side calculations | <1ms | ✅ Ready | ✅ Available | Real-time team builder, matchup analysis |

### ✅ Ready for Next.js Integration

**No server-side setup needed!** The Next.js app agent can start immediately with:
- ✅ **Iframe Embed**: Calculator is running and accessible
- ✅ **npm Package**: Available on npm (`@smogon/calc`)

### ⚠️ Optional: API Endpoint

The API endpoint is **not enabled** but is **optional**:
- ❌ **Not needed** for Next.js app integration
- ✅ **Only needed** if you want Discord bot `/calc` command with programmatic API calls
- Can be enabled later without blocking Next.js work

---

## 1. 🖼️ Iframe Embed (Easiest)

### Use Case
- Embedding full calculator UI in Next.js pages
- Standalone calculator access
- Quick integration without code changes

### Implementation

#### Next.js Component
```tsx
// app/components/damage-calculator.tsx
export function DamageCalculatorEmbed() {
  return (
    <div className="w-full h-screen">
      <iframe
        src="https://aab-calc.moodmnky.com"
        width="100%"
        height="100%"
        title="Pokémon Damage Calculator"
        allow="fullscreen"
        className="border-0"
      />
    </div>
  )
}
```

#### Standalone Page
```tsx
// app/calc/page.tsx
export default function CalcPage() {
  return (
    <div className="container mx-auto p-4">
      <h1>Damage Calculator</h1>
      <DamageCalculatorEmbed />
    </div>
  )
}
```

### Pros
- ✅ Zero code changes needed
- ✅ Full calculator features
- ✅ Always up-to-date (uses live service)
- ✅ No bundle size impact

### Cons
- ⚠️ Limited UI customization
- ⚠️ Network latency (~100ms)
- ⚠️ Requires internet connection

---

## 2. 🔌 API Endpoint (Programmatic) ⚠️ Optional

### Use Case
- Discord bot commands
- Server-side calculations
- Batch processing
- Custom UI with backend logic

### ⚠️ Status: Not Enabled (Optional)

**Important**: The API endpoint is **not currently enabled** and is **not required** for Next.js integration.

- ✅ **server.js** exists in the container
- ✅ **express** is installed
- ❌ **API is not running** (only static files are served)
- ⚠️ **Only needed** if you want Discord bot integration with programmatic calls

### Setup: Enable API Server (If Needed)

The damage-calc repo includes `server.js` with an Express API. To enable it:

#### Option A: Add API to Existing Container

Modify the Dockerfile to run both static server and API:

```dockerfile
# Add to Dockerfile
RUN npm install express
COPY server.js /app/server.js

# Run both services
CMD ["sh", "-c", "node server.js & serve -s dist -l 5000"]
```

#### Option B: Create Separate API Service

Create a new service in `docker-compose.yml`:

```yaml
damage-calc-api:
  build:
    context: ./tools/damage-calc
    dockerfile: Dockerfile.api
  ports:
    - "5001:3000"
  environment:
    - NODE_ENV=production
```

### API Usage

#### Discord Bot Integration
```typescript
// tools/discord-bot/index.ts

// Add new command
new SlashCommandBuilder()
  .setName("calc")
  .setDescription("Calculate damage between Pokémon")
  .addStringOption(option => 
    option.setName("attacker")
      .setDescription("Attacking Pokémon name")
      .setRequired(true)
  )
  .addStringOption(option => 
    option.setName("defender")
      .setDescription("Defending Pokémon name")
      .setRequired(true)
  )
  .addStringOption(option => 
    option.setName("move")
      .setDescription("Move name")
      .setRequired(true)
  )

// Handler
async function handleCalcCommand(interaction: any) {
  const attacker = interaction.options.getString("attacker")
  const defender = interaction.options.getString("defender")
  const move = interaction.options.getString("move")
  
  try {
    const response = await fetch('http://damage-calc-api:3000/calculate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        gen: 9,
        attackingPokemon: attacker,
        defendingPokemon: defender,
        moveName: move,
        attackingPokemonOptions: {},
        defendingPokemonOptions: {}
      })
    })
    
    const result = await response.json()
    const damage = result.damage.join(' - ')
    const percent = result.percent.join(' - ')
    
    await interaction.reply(
      `**${attacker}** using **${move}** vs **${defender}**:\n` +
      `Damage: ${damage} (${percent}%)`
    )
  } catch (error) {
    await interaction.reply("Error calculating damage")
  }
}
```

#### Next.js API Route
```typescript
// app/api/calc/route.ts
import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  const body = await req.json()
  
  const response = await fetch('http://damage-calc-api:3000/calculate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  })
  
  const result = await response.json()
  return NextResponse.json(result)
}
```

### Pros
- ✅ Programmatic access
- ✅ Can be called from any service
- ✅ Good for Discord bot
- ✅ Server-side processing

### Cons
- ⚠️ Requires API setup
- ⚠️ Network latency (~50ms)
- ⚠️ More complex than iframe

---

## 3. 📦 npm Package (Fastest)

### Use Case
- Real-time calculations in team builder
- Matchup analysis components
- EV tuning tools
- "What-if" scenarios (tera types, items, spreads)

### Setup

```bash
# In your Next.js app directory
npm install @smogon/calc
```

### Implementation

#### Team Builder Component
```typescript
// app/components/team-builder/damage-preview.tsx
'use client'

import { calculate, Generations, Pokemon, Move } from '@smogon/calc'
import { useState, useEffect } from 'react'

interface DamagePreviewProps {
  attacker: { name: string; stats: any; item?: string; ability?: string }
  defender: { name: string; stats: any; item?: string; ability?: string }
  move: string
}

export function DamagePreview({ attacker, defender, move }: DamagePreviewProps) {
  const [result, setResult] = useState<any>(null)
  
  useEffect(() => {
    const gen = Generations.get(9)
    
    const attackerPokemon = new Pokemon(gen, attacker.name, {
      level: 50,
      evs: attacker.stats,
      item: attacker.item,
      ability: attacker.ability
    })
    
    const defenderPokemon = new Pokemon(gen, defender.name, {
      level: 50,
      evs: defender.stats,
      item: defender.item,
      ability: defender.ability
    })
    
    const moveObj = new Move(gen, move)
    
    const calcResult = calculate(gen, attackerPokemon, defenderPokemon, moveObj)
    setResult(calcResult)
  }, [attacker, defender, move])
  
  if (!result) return <div>Calculating...</div>
  
  return (
    <div className="p-4 border rounded">
      <h3>Damage Calculation</h3>
      <p>Damage: {result.damage.join(' - ')}</p>
      <p>Percent: {result.percent.join(' - ')}%</p>
      {result.desc && <p className="text-sm text-gray-600">{result.desc}</p>}
    </div>
  )
}
```

#### Matchup Analysis Component
```typescript
// app/components/matchups/damage-matrix.tsx
'use client'

import { calculate, Generations, Pokemon, Move } from '@smogon/calc'

export function DamageMatrix({ 
  yourTeam, 
  opponentTeam 
}: { 
  yourTeam: any[]
  opponentTeam: any[]
}) {
  const gen = Generations.get(9)
  
  const calculateMatchup = (attacker: any, defender: any, move: string) => {
    const attackerPokemon = new Pokemon(gen, attacker.name, { level: 50 })
    const defenderPokemon = new Pokemon(gen, defender.name, { level: 50 })
    const moveObj = new Move(gen, move)
    
    return calculate(gen, attackerPokemon, defenderPokemon, moveObj)
  }
  
  return (
    <table>
      <thead>
        <tr>
          <th>Your Pokémon</th>
          {opponentTeam.map(p => <th key={p.name}>{p.name}</th>)}
        </tr>
      </thead>
      <tbody>
        {yourTeam.map(attacker => (
          <tr key={attacker.name}>
            <td>{attacker.name}</td>
            {opponentTeam.map(defender => {
              const result = calculateMatchup(attacker, defender, attacker.move)
              return (
                <td key={defender.name}>
                  {result.percent.join(' - ')}%
                </td>
              )
            })}
          </tr>
        ))}
      </tbody>
    </table>
  )
}
```

### Pros
- ✅ **Instant** calculations (<1ms)
- ✅ Full UI control
- ✅ Works offline
- ✅ Real-time updates
- ✅ Smaller bundle (~200KB)

### Cons
- ⚠️ Requires npm install
- ⚠️ Adds to bundle size
- ⚠️ Need to manage updates

---

## 🎯 Recommended Integration Strategy

### For Next.js App (Ready Now):

1. **Iframe Embed** → Standalone calculator page (`/calc`) ✅ **Ready**
2. **npm Package** → Team builder damage previews ✅ **Ready**

### Optional (Can Do Later):

3. **API Endpoint** → Discord bot `/calc` command ⏳ **Optional**

---

## 🚀 Implementation Roadmap

### Phase 1: Next.js Integration (Ready Now) ✅

**No server-side setup needed!**

1. **Iframe Embed**:
   - ✅ Calculator already running at `https://aab-calc.moodmnky.com`
   - Add `/calc` page in Next.js app
   - Embed iframe component

2. **npm Package**:
   - Install `@smogon/calc` in Next.js app
   - Create damage preview component
   - Add to team builder page
   - Create matchup analysis view

### Phase 2: Discord Bot Integration (Optional) ⏳

**Can be done later, doesn't block Next.js work**

1. Enable API server in damage-calc container
2. Add `/calc` Discord command
3. Test with real Pokémon data

---

## 📋 Specific Integration Examples

### Discord Bot: `/calc` Command

```typescript
// Add to tools/discord-bot/index.ts

new SlashCommandBuilder()
  .setName("calc")
  .setDescription("Calculate damage between Pokémon")
  .addStringOption(option => 
    option.setName("attacker")
      .setDescription("Attacking Pokémon")
      .setRequired(true)
      .setAutocomplete(true)
  )
  .addStringOption(option => 
    option.setName("defender")
      .setDescription("Defending Pokémon")
      .setRequired(true)
      .setAutocomplete(true)
  )
  .addStringOption(option => 
    option.setName("move")
      .setDescription("Move name")
      .setRequired(true)
      .setAutocomplete(true)
  )

async function handleCalcCommand(interaction: any) {
  const attacker = interaction.options.getString("attacker")
  const defender = interaction.options.getString("defender")
  const move = interaction.options.getString("move")
  
  // Option 1: Link to calculator
  await interaction.reply(
    `Calculate damage: https://aab-calc.moodmnky.com\n` +
    `Pre-filled: ${attacker} vs ${defender} using ${move}`
  )
  
  // Option 2: API call (if API enabled)
  // const result = await fetch('http://damage-calc-api:3000/calculate', ...)
}
```

### Next.js: Team Builder Integration

```tsx
// app/teams/builder/page.tsx
import { DamagePreview } from '@/components/team-builder/damage-preview'
import { DamageMatrix } from '@/components/matchups/damage-matrix'

export default function TeamBuilderPage() {
  return (
    <div>
      <h1>Team Builder</h1>
      
      {/* Your team */}
      <TeamRoster />
      
      {/* Damage preview for selected matchup */}
      <DamagePreview 
        attacker={selectedAttacker}
        defender={selectedDefender}
        move={selectedMove}
      />
      
      {/* Full matchup matrix */}
      <DamageMatrix 
        yourTeam={yourTeam}
        opponentTeam={opponentTeam}
      />
      
      {/* Link to full calculator */}
      <a href="/calc" target="_blank">
        Open Full Calculator
      </a>
    </div>
  )
}
```

### Next.js: Standalone Calculator Page

```tsx
// app/calc/page.tsx
export default function CalcPage() {
  return (
    <div className="container mx-auto">
      <h1>Damage Calculator</h1>
      <iframe
        src="https://aab-calc.moodmnky.com"
        width="100%"
        height="800px"
        className="border rounded"
        title="Pokémon Damage Calculator"
      />
    </div>
  )
}
```

---

## 🔧 Technical Details

### API Endpoint Structure (if enabled)

**Endpoint**: `POST /calculate`

**Request**:
```json
{
  "gen": 9,
  "attackingPokemon": "Pikachu",
  "defendingPokemon": "Charizard",
  "moveName": "Thunderbolt",
  "attackingPokemonOptions": {
    "level": 50,
    "evs": { "spa": 252 },
    "item": "Light Ball"
  },
  "defendingPokemonOptions": {
    "level": 50,
    "evs": { "spd": 252 }
  },
  "field": {}
}
```

**Response**:
```json
{
  "damage": [120, 142, 164, 186, 208, 230, 252, 274, 296, 318, 340, 362, 384, 406, 428, 450],
  "percent": [39.5, 46.8, 54.1, 61.3, 68.5, 75.8, 83.0, 90.3, 97.5, 104.8, 112.0, 119.3, 126.5, 133.8, 141.0, 148.3],
  "desc": "39.5 - 148.3%"
}
```

### npm Package API

```typescript
import { calculate, Generations, Pokemon, Move, Field } from '@smogon/calc'

const gen = Generations.get(9)

const attacker = new Pokemon(gen, 'Pikachu', {
  level: 50,
  evs: { spa: 252 },
  item: 'Light Ball'
})

const defender = new Pokemon(gen, 'Charizard', {
  level: 50,
  evs: { spd: 252 }
})

const move = new Move(gen, 'Thunderbolt')
const field = new Field()

const result = calculate(gen, attacker, defender, move, field)

console.log(result.damage)    // [120, 142, ...]
console.log(result.percent)    // [39.5, 46.8, ...]
console.log(result.desc)       // "39.5 - 148.3%"
```

---

## ✅ Next Steps

### For Next.js App Agent (Ready Now):

1. **Immediate**: Add `/calc` page with iframe embed
2. **Immediate**: Install `@smogon/calc` npm package
3. **Short-term**: Add damage preview components to team builder
4. **Short-term**: Create matchup analysis views

### Optional (Can Do Later):

5. **Optional**: Enable API server for Discord bot integration
6. **Optional**: Add Discord `/calc` command with API calls

---

## 📋 Server Setup Status

### ✅ What's Ready (No Setup Needed)

- **Iframe Embed**: Calculator running at `https://aab-calc.moodmnky.com`
- **npm Package**: Available on npm (`@smogon/calc`)
- **Next.js Integration**: Can start immediately

### ⚠️ What's Optional (Not Needed for Next.js)

- **API Endpoint**: Not enabled, only needed for Discord bot programmatic calls
- **Server Changes**: None required for Next.js app integration

---

**Status**: ✅ **Calculator is ready for Next.js integration!** No server-side setup needed. Choose your integration method(s) based on your needs.
