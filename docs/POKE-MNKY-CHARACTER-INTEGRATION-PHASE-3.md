# POKE MNKY Character Integration - Phase 3: AI Chat UI Implementation

**Date**: 2026-01-18  
**Status**: 📋 Planning & Research Complete  
**Priority**: High

---

## 📋 Overview

Phase 3 focuses on implementing robust, production-ready AI chat interfaces across the POKE MNKY application. This phase integrates specialized AI chat UI components that support our expansive use cases including tool calling, MCP integration, streaming responses, and multi-agent workflows.

---

## 🎯 Phase 3 Objectives

### Primary Goals
1. **Replace Basic Chat Interfaces** with production-ready AI chat components
2. **Integrate POKE MNKY Character** into all AI chat interfaces
3. **Support Advanced Features**: Tool calling, streaming, markdown rendering, code blocks
4. **MCP Integration**: Seamless integration with our MCP servers (draft pool, Supabase, etc.)
5. **Multi-Agent Support**: Different UI configurations for Draft Assistant, Battle Strategy, Free Agency agents

### Use Cases to Support

#### 1. **Draft Assistant Chat** (`/draft`)
- Real-time draft pick recommendations
- Budget tracking and warnings
- Team composition analysis
- MCP tool calls: `get_available_pokemon`, `get_team_budget`, `analyze_pick_value`
- Streaming responses with reasoning display

#### 2. **Battle Strategy Chat** (`/showdown/match-lobby`)
- Move recommendations during battles
- Matchup analysis
- Tera type suggestions
- Battle event streaming
- Tool calls: Battle analysis, move calculations

#### 3. **Free Agency Assistant** (`/dashboard/free-agency`)
- Trade evaluation
- Roster gap analysis
- Transaction recommendations
- Tool calls: `get_team_picks`, `analyze_pick_value`

#### 4. **Pokédex AI Assistant** (`/pokedex`) - ✅ Already Implemented
- Pokémon Q&A
- Competitive strategy questions
- Draft pool queries
- Currently uses basic UI - **Upgrade Target**

#### 5. **General AI Chat** (Future)
- Help system
- Onboarding assistant
- General league questions

---

## 🔍 Research: AI Chat UI Packages Analysis

### Evaluation Criteria

| Criterion | Weight | Description |
|-----------|--------|-------------|
| **shadcn/ui Compatibility** | ⭐⭐⭐⭐⭐ | Must be built on shadcn/ui or easily customizable |
| **Vercel AI SDK Integration** | ⭐⭐⭐⭐⭐ | Native support for `useChat`, `useAssistant`, streaming |
| **Tool Calling Support** | ⭐⭐⭐⭐⭐ | Display tool invocations, results, approval workflows |
| **MCP Integration** | ⭐⭐⭐⭐ | Support for Model Context Protocol servers |
| **Streaming Support** | ⭐⭐⭐⭐⭐ | Real-time token streaming, markdown rendering |
| **Code Block Rendering** | ⭐⭐⭐⭐ | Syntax highlighting, copy buttons |
| **Theme Customization** | ⭐⭐⭐⭐ | Match POKE MNKY theme (Pokemon-inspired) |
| **TypeScript Support** | ⭐⭐⭐⭐⭐ | Full TypeScript types |
| **Production Ready** | ⭐⭐⭐⭐⭐ | Battle-tested, maintained, active development |
| **Bundle Size** | ⭐⭐⭐ | Reasonable bundle size for Next.js |

---

## 🏆 Top Contenders Analysis

### 1. **AI Elements (Vercel)** ⭐⭐⭐⭐⭐ **RECOMMENDED**

**GitHub**: Official Vercel project  
**Installation**: `npx ai-elements@latest`  
**Documentation**: https://ai-sdk.dev/elements

#### ✅ Strengths

**Perfect Integration**:
- Built specifically for Vercel AI SDK
- Native support for `useChat`, `useAssistant`, `streamUI`
- Seamless integration with our existing AI SDK setup

**shadcn/ui Foundation**:
- Built on top of shadcn/ui (copy-paste components)
- Full code ownership (no vendor lock-in)
- Customizable via Tailwind CSS and CSS variables
- Matches our existing component architecture

**Advanced Features**:
- ✅ **Tool Calling**: Built-in tool invocation display, approval workflows
- ✅ **MCP Support**: Native MCP server integration (AI SDK 6)
- ✅ **Streaming**: Real-time token streaming with markdown rendering
- ✅ **Code Blocks**: Syntax highlighting with copy/download buttons
- ✅ **Reasoning Display**: Shows AI thinking process
- ✅ **File Attachments**: Support for file uploads in chat
- ✅ **Message Actions**: Copy, rate, regenerate, branch conversations
- ✅ **Auto-scroll**: Intelligent scroll handling during streaming

**Component Library**:
- `Conversation` - Main chat container
- `ConversationContent` - Message list with auto-scroll
- `Message` - Individual message component
- `MessageContent` - Message content with markdown
- `MessageResponse` - Assistant response rendering
- `MessageActions` - Copy, rate, regenerate buttons
- `PromptInput` - Chat input with attachments
- `Response` - Streaming response display
- `ToolCall` - Tool invocation display
- `CodeBlock` - Syntax-highlighted code blocks
- `Citation` - Source citations
- `Reasoning` - AI reasoning display

**Production Ready**:
- Used by Vercel internally
- Active development (2025 updates)
- Comprehensive documentation
- TypeScript-first

#### ⚠️ Considerations

- **New Library**: Released in 2024, less mature than some alternatives
- **Vercel Ecosystem**: Best experience with Vercel AI SDK (which we use ✅)
- **Learning Curve**: Need to learn component API (well-documented)

#### 📦 Installation

```bash
# Install AI Elements CLI
npx ai-elements@latest

# Or via shadcn CLI
npx shadcn@latest add conversation message prompt-input response
```

#### 💻 Example Usage

```tsx
"use client"

import { useChat } from "@ai-sdk/react"
import { Conversation, ConversationContent } from "@/components/ai-elements/conversation"
import { Message, MessageContent } from "@/components/ai-elements/message"
import { PromptInput } from "@/components/ai-elements/prompt-input"
import { PokeMnkyAssistant } from "@/components/ui/poke-mnky-avatar"

export default function DraftAssistantChat() {
  const { messages, input, handleInputChange, handleSubmit, isLoading } = useChat({
    api: "/api/ai/draft-assistant",
  })

  return (
    <Conversation>
      <ConversationContent>
        {messages.length === 0 && (
          <EmptyState
            title="Draft Assistant Ready"
            description="Ask me about draft picks, team composition, or budget analysis."
            characterSize={80}
          />
        )}
        {messages.map((message) => (
          <Message key={message.id} role={message.role}>
            <MessageContent>
              {message.role === "assistant" && (
                <PokeMnkyAssistant size={32} className="mb-2" />
              )}
              {message.content}
              {message.toolInvocations?.map((tool) => (
                <ToolCall key={tool.toolCallId} tool={tool} />
              ))}
            </MessageContent>
          </Message>
        ))}
      </ConversationContent>
      <PromptInput
        value={input}
        onChange={handleInputChange}
        onSubmit={handleSubmit}
        isLoading={isLoading}
        placeholder="Ask about draft picks..."
      />
    </Conversation>
  )
}
```

---

### 2. **assistant-ui** ⭐⭐⭐⭐

**GitHub**: https://github.com/assistant-ui/assistant-ui  
**NPM**: `@assistant-ui/react`  
**Stats**: 7,900+ stars, 50k+ monthly downloads  
**Backing**: Y Combinator (W25)

#### ✅ Strengths

**Mature & Popular**:
- Widely adopted (LangChain, Stack AI, Browser Use)
- Active community and development
- Production-tested at scale

**Framework Agnostic**:
- Works with Vercel AI SDK, LangGraph, Mastra
- Composable primitives (Radix-style approach)
- Not tied to specific provider

**Advanced Features**:
- ✅ Streaming support
- ✅ Tool calling display
- ✅ Generative UI (map tool calls to custom components)
- ✅ Human-in-the-loop workflows
- ✅ Auto-scroll, retries, attachments
- ✅ Optional Assistant Cloud (managed persistence)

**Composable Architecture**:
- Radix-style primitives instead of monolithic components
- Highly customizable
- Can build custom chat experiences

#### ⚠️ Considerations

- **Less shadcn/ui Native**: Not built specifically on shadcn/ui (but compatible)
- **More Setup Required**: Need to compose components yourself
- **Learning Curve**: More flexible = more configuration needed

#### 📦 Installation

```bash
npm install @assistant-ui/react @assistant-ui/react-ai-sdk
```

#### 💻 Example Usage

```tsx
import { AssistantRuntimeProvider } from "@assistant-ui/react"
import { useVercelAI } from "@assistant-ui/react-ai-sdk"
import { Thread } from "@assistant-ui/react"

export default function Chat() {
  const runtime = useVercelAI({ api: "/api/chat" })
  
  return (
    <AssistantRuntimeProvider runtime={runtime}>
      <Thread />
    </AssistantRuntimeProvider>
  )
}
```

---

### 3. **Shadcn Chatbot Kit** ⭐⭐⭐⭐

**Source**: Blazity template  
**Installation**: Via shadcn CLI or copy-paste  
**License**: MIT

#### ✅ Strengths

**shadcn/ui Native**:
- Built specifically for shadcn/ui
- Copy-paste components (full ownership)
- Easy customization

**Complete Kit**:
- Pre-built chat components
- Auto-scrolling message areas
- File upload support
- Prompt suggestions
- Message actions (copy, rate)
- Loading states

**Production Ready**:
- Used in production applications
- Well-documented
- TypeScript support

#### ⚠️ Considerations

- **Template-Based**: Less flexible than component libraries
- **Less Advanced**: May not support all advanced features (MCP, tool calling)
- **Maintenance**: Community-maintained template

---

### 4. **Prompt Kit** ⭐⭐⭐

**GitHub**: Open source  
**Focus**: AI application building blocks

#### ✅ Strengths

- Built on shadcn/ui
- Customizable components
- Open source

#### ⚠️ Considerations

- **Less Mature**: Smaller community
- **Limited Documentation**: May require more research
- **Feature Gaps**: May not support all advanced features

---

## 🎯 Recommendation: **AI Elements (Vercel)**

### Why AI Elements is the Best Choice

1. **Perfect Ecosystem Fit**:
   - Built for Vercel AI SDK (which we already use)
   - Native MCP support (AI SDK 6)
   - Seamless integration with our existing setup

2. **shadcn/ui Native**:
   - Copy-paste components (full code ownership)
   - Matches our component architecture
   - Easy to customize for Pokemon theme

3. **Advanced Features**:
   - Tool calling display ✅
   - MCP integration ✅
   - Streaming with markdown ✅
   - Code blocks with syntax highlighting ✅
   - Reasoning display ✅
   - File attachments ✅

4. **Production Ready**:
   - Official Vercel project
   - Active development
   - Comprehensive documentation
   - TypeScript-first

5. **Character Integration**:
   - Easy to add `PokeMnkyAssistant` to messages
   - Customizable avatars per agent type
   - Theme-aware (light/dark mode)

---

## 📐 Implementation Plan

### Phase 3A: Foundation Setup (Week 1) ✅ **COMPLETE**

#### Step 1: Install AI Elements ✅
```bash
# Installed via: npx ai-elements@latest
# Components installed:
# ✅ conversation, message, tool, code-block, reasoning, sources, loader
# ✅ chain-of-thought, context, image, plan, shimmer
# ✅ prompt-input wrapper (custom, using existing components)
```

**Status**: 12/15 components installed + custom prompt-input wrapper (100% functional)  
**Documentation**: See `docs/AI-ELEMENTS-INSTALLATION-REPORT.md`

#### Step 2: Create Base Chat Component ✅
**File**: `components/ai/base-chat-interface.tsx`

**Features Implemented**:
- ✅ Wrapper around AI Elements components
- ✅ POKE MNKY character integration (red-blue & gold-black palettes)
- ✅ Theme-aware styling
- ✅ BlurFade animations
- ✅ Tool call display
- ✅ Reasoning display
- ✅ Sources/citations
- ✅ Code block rendering
- ✅ Loading states
- ✅ Prompt input wrapper (custom implementation)

#### Step 3: Create Agent-Specific Wrappers ✅ **COMPLETE**
- ✅ `components/ai/draft-assistant-chat.tsx` (5 quick actions)
- ✅ `components/ai/battle-strategy-chat.tsx` (5 quick actions)
- ✅ `components/ai/free-agency-chat.tsx` (5 quick actions)
- ✅ `components/ai/pokedex-chat.tsx` (5 quick actions, conditional)

**Additional Components Created**:
- ✅ `components/ai/prompt-input-wrapper.tsx` - Custom prompt input
- ✅ `components/ai/quick-actions.tsx` - Reusable quick actions

**See**: `docs/PHASE-3A-COMPLETE-SUMMARY.md` for complete status

### Phase 3B: API Route Updates ✅ **COMPLETE**

#### Step 1: Update API Routes for useChat Compatibility ✅
**Files Updated**:
- ✅ `app/api/ai/draft-assistant/route.ts`
- ✅ `app/api/ai/battle-strategy/route.ts`
- ✅ `app/api/ai/free-agency/route.ts`
- ✅ `app/api/ai/pokedex/route.ts`

**Changes Implemented**:
- ✅ Converted to use `streamText` from Vercel AI SDK
- ✅ Added MCP tool integration via `openai.tools.mcp`
- ✅ Streaming responses via `toDataStreamResponse()`
- ✅ Maintains context (teamId, seasonId, etc.)
- ✅ System messages with agent-specific instructions

**Status**: All routes updated and ready for useChat integration  
**Documentation**: See `docs/PHASE-3B-API-ROUTES-UPDATE-COMPLETE.md`

### Phase 3C: Page Integration ✅ **COMPLETE**

#### Step 1: Page Integrations ✅
**Files Updated**:
- ✅ `app/draft/page.tsx` - Added DraftAssistantChat in right sidebar
- ✅ `app/showdown/match-lobby/page.tsx` - Added BattleStrategyChat in new tab
- ✅ `app/dashboard/free-agency/page.tsx` - Added FreeAgencyChat in new "AI Assistant" tab
- ✅ `app/pokedex/page.tsx` - Replaced custom AI chat with PokedexChat

**Changes Implemented**:
- ✅ All 4 agent components integrated
- ✅ Proper context passing (teamId, seasonId, selectedPokemon)
- ✅ Fixed height containers for consistent UI
- ✅ Tab-based organization where appropriate
- ✅ Code cleanup (removed unused code from Pokédex)

**Status**: All pages updated and ready for testing  
**Documentation**: See `docs/PHASE-3C-PAGE-INTEGRATION-COMPLETE.md`

---

### Phase 3B: Draft Assistant Integration (Week 2)

#### Step 1: Update Draft Room Page
**File**: `app/draft/page.tsx`

**Integration**:
- Replace basic chat with `DraftAssistantChat`
- Add character to chat header
- Configure MCP tools display
- Add budget tracking UI

#### Step 2: Enhance API Route
**File**: `app/api/ai/draft-assistant/route.ts`

**Enhancements**:
- Return tool calls in proper format
- Add streaming support
- Include reasoning display
- Add conversation context

#### Step 3: Tool Call Display
- Show `get_available_pokemon` results as cards
- Display `get_team_budget` as progress bar
- Show `analyze_pick_value` as comparison table

---

### Phase 3C: Battle Strategy Integration (Week 3)

#### Step 1: Battle Lobby Integration
**File**: `app/showdown/match-lobby/page.tsx`

**Features**:
- Real-time battle chat
- Move recommendations during turns
- Matchup analysis display
- Tera type suggestions

#### Step 2: Streaming Battle Events
- Stream battle events as they happen
- Display tool calls for move calculations
- Show reasoning for recommendations

---

### Phase 3D: Free Agency Integration (Week 4)

#### Step 1: Free Agency Page Integration
**File**: `app/dashboard/free-agency/page.tsx`

**Features**:
- Trade evaluation chat
- Roster gap analysis
- Transaction recommendations
- Tool calls for team analysis

---

### Phase 3E: Pokédex Upgrade (Week 5)

#### Step 1: Upgrade Existing Chat
**File**: `app/pokedex/page.tsx`

**Changes**:
- Replace basic textarea/response with AI Elements
- Add character to messages
- Improve markdown rendering
- Add code block support

---

## 🎨 Design Specifications

### Character Integration

**Assistant Messages**:
```tsx
<Message role="assistant">
  <MessageContent>
    <div className="flex items-start gap-3">
      <PokeMnkyAssistant size={32} className="shrink-0 mt-1" />
      <div className="flex-1">
        {message.content}
      </div>
    </div>
  </MessageContent>
</Message>
```

**Agent-Specific Characters**:
- **Draft Assistant**: `PokeMnkyAssistant` (red-blue)
- **Battle Strategy**: `PokeMnkyAssistant` (red-blue)
- **Free Agency**: `PokeMnkyAssistant` (red-blue)
- **Admin Tools**: `PokeMnkyPremium` (gold-black)

### Theme Customization

**Color Scheme**:
- Use existing Pokemon-inspired colors
- Primary: Pokemon red/blue
- Accent: Pokemon yellow/gold
- Muted: Pokemon gray tones

**Component Styling**:
- Customize AI Elements components via Tailwind
- Add Pokemon-themed borders, shadows
- Use existing design tokens

---

## 🔧 Technical Requirements

### Dependencies

```json
{
  "dependencies": {
    "@ai-sdk/react": "^1.0.0",
    "ai": "^6.0.0",
    "@vercel/ai": "^6.0.0"
  }
}
```

### Environment Variables

```env
# Already configured
OPENAI_API_KEY=...
SUPABASE_URL=...
SUPABASE_SERVICE_ROLE_KEY=...

# MCP Server URLs
MCP_DRAFT_POOL_URL=http://localhost:3001/mcp
```

### API Route Structure

```typescript
// app/api/ai/draft-assistant/route.ts
import { streamText } from 'ai'
import { openai } from '@ai-sdk/openai'

export async function POST(req: Request) {
  const { messages } = await req.json()
  
  const result = await streamText({
    model: openai('gpt-5.2'),
    messages,
    tools: {
      get_available_pokemon: { /* MCP tool */ },
      get_team_budget: { /* MCP tool */ },
      analyze_pick_value: { /* MCP tool */ },
    },
  })
  
  return result.toDataStreamResponse()
}
```

---

## 📊 Success Metrics

### User Experience
- ✅ Smooth streaming responses (< 100ms first token)
- ✅ Tool calls display clearly
- ✅ Character appears consistently
- ✅ Code blocks render correctly
- ✅ Mobile-responsive design

### Technical
- ✅ No bundle size increase > 50KB
- ✅ TypeScript types complete
- ✅ No console errors
- ✅ Accessibility (WCAG 2.1 AA)

### Feature Completeness
- ✅ All 5 use cases implemented
- ✅ MCP tool integration working
- ✅ Streaming responses functional
- ✅ Character integrated in all chats

---

## 🚀 Future Enhancements (Phase 4)

### Advanced Features
1. **Conversation Persistence**
   - Save chat history to Supabase
   - Resume conversations
   - Share conversations

2. **Multi-Modal Support**
   - Image uploads for team screenshots
   - Battle replay analysis
   - Sprite display in chat

3. **Voice Input**
   - Speech-to-text for questions
   - Voice responses (TTS)

4. **Collaborative Features**
   - Shared chat rooms for draft sessions
   - Real-time collaboration
   - Team chat integration

5. **Analytics**
   - Track most common questions
   - Measure agent effectiveness
   - User satisfaction metrics

---

## 📚 Resources

### Documentation
- **AI Elements**: https://ai-sdk.dev/elements
- **Vercel AI SDK**: https://ai-sdk.dev
- **MCP Integration**: https://ai-sdk.dev/docs/ai-sdk-core/mcp

### Examples
- **Chatbot Example**: https://ai-sdk.dev/elements/examples/chatbot
- **v0 Clone**: https://ai-sdk.dev/elements/examples/v0-clone
- **Workflow Example**: https://ai-sdk.dev/elements/examples/workflow

### Community
- **Vercel Community**: https://community.vercel.com
- **GitHub Discussions**: https://github.com/vercel/ai/discussions

---

## ✅ Phase 3 Checklist

### Setup
- [ ] Install AI Elements CLI
- [ ] Install required components
- [ ] Configure theme customization
- [ ] Set up base chat component

### Implementation
- [ ] Draft Assistant chat interface
- [ ] Battle Strategy chat interface
- [ ] Free Agency chat interface
- [ ] Pokédex chat upgrade
- [ ] Character integration in all chats

### Testing
- [ ] Test streaming responses
- [ ] Test tool calling display
- [ ] Test MCP integration
- [ ] Test mobile responsiveness
- [ ] Test accessibility

### Documentation
- [ ] Update component documentation
- [ ] Create usage examples
- [ ] Document customization guide
- [ ] Update API documentation

---

**Next Steps**: Begin Phase 3A implementation with AI Elements installation and base chat component creation.
