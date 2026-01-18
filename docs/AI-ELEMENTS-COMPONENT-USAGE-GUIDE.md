# AI Elements Component Usage Guide

**Date**: 2026-01-18  
**Purpose**: Comprehensive guide for using all installed AI Elements components

---

## 📦 Installed Components Overview

### ✅ Core Components (12 installed)

1. **conversation** - Chat container
2. **message** - Message display (includes Response, Actions, Branch)
3. **tool** - Tool call visualization
4. **code-block** - Syntax-highlighted code
5. **reasoning** - AI reasoning display
6. **sources** - Source citations
7. **loader** - Loading indicators
8. **chain-of-thought** - Step-by-step reasoning
9. **context** - Context consumption display
10. **image** - Image display
11. **plan** - Plan/task visualization
12. **shimmer** - Shimmer loading effect

---

## 🎯 Component Usage Examples

### 1. Conversation Component

**Basic Usage**:
```tsx
import {
  Conversation,
  ConversationContent,
  ConversationEmptyState,
  ConversationScrollButton,
} from "@/components/ai-elements/conversation"

<Conversation className="flex-1">
  <ConversationContent>
    {/* Messages go here */}
  </ConversationContent>
  <ConversationScrollButton />
</Conversation>
```

**With Empty State**:
```tsx
<Conversation>
  <ConversationContent>
    {messages.length === 0 ? (
      <ConversationEmptyState
        title="No messages yet"
        description="Start a conversation"
        icon={<PokeMnkyAssistant size={64} />}
      />
    ) : (
      // Messages
    )}
  </ConversationContent>
</Conversation>
```

### 2. Message Component

**Basic Message**:
```tsx
import {
  Message,
  MessageContent,
  MessageResponse,
} from "@/components/ai-elements/message"

<Message from="assistant">
  <MessageContent>
    <MessageResponse>{text}</MessageResponse>
  </MessageContent>
</Message>
```

**With Actions**:
```tsx
import {
  MessageActions,
  MessageAction,
} from "@/components/ai-elements/message"
import { CopyIcon, RefreshCcwIcon } from "lucide-react"

<Message from="assistant">
  <MessageContent>
    <MessageResponse>{text}</MessageResponse>
  </MessageContent>
  <MessageActions>
    <MessageAction
      onClick={() => copy(text)}
      tooltip="Copy"
      label="Copy to clipboard"
    >
      <CopyIcon className="size-3" />
    </MessageAction>
    <MessageAction
      onClick={() => regenerate()}
      tooltip="Retry"
      label="Regenerate response"
    >
      <RefreshCcwIcon className="size-3" />
    </MessageAction>
  </MessageActions>
</Message>
```

**With Branching** (Alternative Responses):
```tsx
import {
  MessageBranch,
  MessageBranchContent,
  MessageBranchSelector,
  MessageBranchPrevious,
  MessageBranchNext,
  MessageBranchPage,
} from "@/components/ai-elements/message"

<MessageBranch>
  <MessageBranchSelector from="assistant" />
  <MessageBranchContent>
    {/* Alternative response 1 */}
    <Message from="assistant">
      <MessageContent>
        <MessageResponse>Response option 1</MessageResponse>
      </MessageContent>
    </Message>
    {/* Alternative response 2 */}
    <Message from="assistant">
      <MessageContent>
        <MessageResponse>Response option 2</MessageResponse>
      </MessageContent>
    </Message>
  </MessageBranchContent>
  <MessageBranchPrevious />
  <MessageBranchPage />
  <MessageBranchNext />
</MessageBranch>
```

### 3. Tool Component

**Basic Tool Call**:
```tsx
import {
  Tool,
  ToolHeader,
  ToolContent,
  ToolInput,
  ToolOutput,
} from "@/components/ai-elements/tool"
import type { ToolUIPart } from "ai"

const toolPart: ToolUIPart = {
  type: "tool-call",
  toolName: "get_available_pokemon",
  state: "output-available",
  input: { point_range: [15, 18] },
  output: { pokemon: [...], count: 10 },
}

<Tool>
  <ToolHeader
    title={toolPart.toolName}
    type={toolPart.type}
    state={toolPart.state}
  />
  <ToolContent>
    <ToolInput input={toolPart.input} />
    <ToolOutput output={toolPart.output} />
  </ToolContent>
</Tool>
```

**With Error**:
```tsx
<Tool>
  <ToolHeader
    title="get_team_budget"
    type="tool-call"
    state="output-error"
  />
  <ToolContent>
    <ToolInput input={{ team_id: "123" }} />
    <ToolOutput
      output={null}
      errorText="Team not found"
    />
  </ToolContent>
</Tool>
```

### 4. Code Block Component

**Basic Code Block**:
```tsx
import { CodeBlock } from "@/components/ai-elements/code-block"

<CodeBlock
  code={`const example = "Hello World"`
  language="typescript"
  showLineNumbers={true}
/>
```

**With Copy Button**:
```tsx
import { CodeBlock, CodeBlockCopyButton } from "@/components/ai-elements/code-block"

<CodeBlock code={code} language="json">
  <CodeBlockCopyButton />
</CodeBlock>
```

### 5. Reasoning Component

**Basic Reasoning**:
```tsx
import {
  Reasoning,
  ReasoningContent,
  ReasoningTrigger,
} from "@/components/ai-elements/reasoning"

<Reasoning isStreaming={isStreaming}>
  <ReasoningTrigger />
  <ReasoningContent>
    {reasoningText}
  </ReasoningContent>
</Reasoning>
```

**With Streaming**:
```tsx
const { status } = useChat()
const isStreaming = status === "streaming"

<Reasoning isStreaming={isStreaming}>
  <ReasoningTrigger />
  <ReasoningContent>
    {streamingReasoningText}
  </ReasoningContent>
</Reasoning>
```

### 6. Sources Component

**Basic Sources**:
```tsx
import {
  Sources,
  SourcesContent,
  SourcesTrigger,
  Source,
} from "@/components/ai-elements/sources"

<Sources>
  <SourcesTrigger count={3} />
  <SourcesContent>
    <Source href="https://example.com" title="Example Source" />
    <Source href="https://example2.com" title="Another Source" />
  </SourcesContent>
</Sources>
```

### 7. Chain of Thought Component

**Basic Chain of Thought**:
```tsx
import {
  ChainOfThought,
  ChainOfThoughtStep,
  ChainOfThoughtTrigger,
} from "@/components/ai-elements/chain-of-thought"

<ChainOfThought>
  <ChainOfThoughtTrigger />
  <ChainOfThoughtStep
    step={1}
    content="Analyzing team budget..."
  />
  <ChainOfThoughtStep
    step={2}
    content="Checking available Pokémon..."
  />
  <ChainOfThoughtStep
    step={3}
    content="Evaluating type coverage..."
  />
</ChainOfThought>
```

### 8. Plan Component

**Basic Plan**:
```tsx
import {
  Plan,
  PlanContent,
  PlanTrigger,
  PlanStep,
  PlanAction,
} from "@/components/ai-elements/plan"

<Plan>
  <PlanTrigger />
  <PlanContent>
    <PlanStep step={1} content="Draft 2-3 core Pokémon" />
    <PlanStep step={2} content="Fill type coverage gaps" />
    <PlanStep step={3} content="Add support Pokémon" />
  </PlanContent>
  <PlanAction onClick={executePlan}>
    Execute Plan
  </PlanAction>
</Plan>
```

### 9. Context Component

**Basic Context**:
```tsx
import {
  Context,
  ContextContent,
  ContextTrigger,
} from "@/components/ai-elements/context"

<Context>
  <ContextTrigger />
  <ContextContent>
    <div>Tokens used: 1,234 / 4,096</div>
    <div>MCP calls: 3</div>
    <div>Context window: 75%</div>
  </ContextContent>
</Context>
```

### 10. Image Component

**Basic Image**:
```tsx
import { Image } from "@/components/ai-elements/image"

<Image
  src={imageUrl}
  alt="Pokémon sprite"
  width={200}
  height={200}
/>
```

### 11. Loader Component

**Basic Loader**:
```tsx
import { Loader } from "@/components/ai-elements/loader"

<Loader size={16} />
```

**In Message**:
```tsx
<Message from="assistant">
  <MessageContent>
    <Loader />
  </MessageContent>
</Message>
```

---

## 🎨 Integration with POKE MNKY Character

### Character in Header
```tsx
import { PokeMnkyAssistant, PokeMnkyPremium } from "@/components/ui/poke-mnky-avatar"

<div className="flex items-center gap-3">
  <PokeMnkyAssistant size={32} />
  <h2>Draft Assistant</h2>
</div>
```

### Character in Empty State
```tsx
<ConversationEmptyState
  title="Start a conversation"
  description="Ask me anything!"
  icon={<PokeMnkyAssistant size={64} className="opacity-50" />}
/>
```

### Character in Messages (Future Enhancement)
```tsx
<Message from="assistant">
  <div className="flex items-start gap-2">
    <PokeMnkyAssistant size={24} className="shrink-0 mt-1" />
    <MessageContent>
      <MessageResponse>{text}</MessageResponse>
    </MessageContent>
  </div>
</Message>
```

---

## 🔧 Advanced Patterns

### Complete Chat Interface
```tsx
import { useChat } from "@ai-sdk/react"
import { BaseChatInterface } from "@/components/ai/base-chat-interface"

function MyChat() {
  return (
    <BaseChatInterface
      apiEndpoint="/api/my-chat"
      title="My Assistant"
      description="Ask me anything"
      characterPalette="red-blue"
      showCharacter={true}
      characterSize={32}
    />
  )
}
```

### Custom Message Rendering
```tsx
{messages.map((message) => (
  <Fragment key={message.id}>
    {message.parts.map((part, i) => {
      switch (part.type) {
        case "text":
          return (
            <Message key={`${message.id}-${i}`} from={message.role}>
              <MessageContent>
                <MessageResponse>{part.text}</MessageResponse>
              </MessageContent>
            </Message>
          )
        case "tool-call":
          return (
            <Tool key={`${message.id}-tool-${i}`}>
              <ToolHeader
                title={part.toolName}
                type={part.type}
                state={part.state}
              />
              <ToolContent>
                <ToolInput input={part.input} />
                <ToolOutput output={part.output} />
              </ToolContent>
            </Tool>
          )
        case "reasoning":
          return (
            <Reasoning key={`${message.id}-reasoning-${i}`}>
              <ReasoningTrigger />
              <ReasoningContent>{part.text}</ReasoningContent>
            </Reasoning>
          )
        default:
          return null
      }
    })}
  </Fragment>
))}
```

---

## 🎯 Use Case Examples

### Draft Assistant
- **Messages**: User questions, AI responses
- **Tool Calls**: `get_available_pokemon`, `get_team_budget`, `analyze_pick_value`
- **Reasoning**: Step-by-step pick recommendation reasoning
- **Plan**: Draft strategy plan
- **Chain of Thought**: Analysis steps

### Battle Strategy
- **Messages**: Move recommendations, matchup analysis
- **Tool Calls**: Battle analysis tools, move calculations
- **Reasoning**: Why a move is recommended
- **Image**: Team previews, type charts

### Free Agency
- **Messages**: Trade evaluations, roster analysis
- **Tool Calls**: `get_team_picks`, `analyze_pick_value`
- **Plan**: Transaction plan
- **Context**: Roster context usage

### Pokédex
- **Messages**: Pokémon Q&A
- **Tool Calls**: `get_pokemon` (if using tools)
- **Image**: Pokémon sprites
- **Code Blocks**: Stats, movesets (formatted)

---

## 📚 Additional Resources

- **AI Elements Docs**: https://ai-sdk.dev/elements
- **Vercel AI SDK**: https://sdk.vercel.ai/docs
- **Installation Report**: `docs/AI-ELEMENTS-INSTALLATION-REPORT.md`
- **Phase 3A Summary**: `docs/PHASE-3A-IMPLEMENTATION-SUMMARY.md`

---

**Last Updated**: 2026-01-18
