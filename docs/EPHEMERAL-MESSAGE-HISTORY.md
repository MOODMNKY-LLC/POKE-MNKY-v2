# Ephemeral Message History - How It Works

**Date**: January 18, 2026  
**Status**: ✅ **CURRENT IMPLEMENTATION** - Ephemeral (in-memory only)

---

## 🎯 Overview

**Yes, message history is ephemeral** - messages are stored only in React component state (in-memory) and are **lost** when:
- Page refreshes
- Tab closes
- Component unmounts
- User navigates away

---

## 🔍 Current Implementation

### How Messages Are Stored

**Location**: `components/ai/base-chat-interface.tsx`

**Storage Mechanism**:
```typescript
const { messages, sendMessage, status, regenerate, error, setMessages } = useChat(useChatOptions)
```

**What `useChat` Does**:
- ✅ Maintains `messages` array in **React component state** (in-memory)
- ✅ Streams responses from API route
- ✅ Updates messages as stream progresses
- ❌ **No localStorage/sessionStorage** - messages are not persisted
- ❌ **No server-side persistence** - API route is stateless

### Message Flow

```
User sends message
    ↓
useChat sends to API route (/api/ai/assistant)
    ↓
API route processes (stateless - receives all messages in request)
    ↓
API route streams response back
    ↓
useChat updates messages array (in-memory only)
    ↓
UI renders messages
    ↓
[Page refresh] → Messages lost ❌
```

---

## 📊 Storage Breakdown

### ✅ What IS Stored (Temporarily)

**In-Memory (React State)**:
- Current conversation messages
- Message parts (text, tool calls, reasoning, etc.)
- Message IDs
- Streaming state

**Duration**: Only while component is mounted

**Lost When**:
- Page refreshes
- Tab closes
- Component unmounts
- Navigation away

### ❌ What is NOT Stored

**No Persistence**:
- ❌ No localStorage
- ❌ No sessionStorage
- ❌ No server-side database
- ❌ No cookies
- ❌ No IndexedDB

---

## 🔧 Technical Details

### useChat Hook (Vercel AI SDK)

**Package**: `@ai-sdk/react`

**Default Behavior**:
- Messages stored in React state (ephemeral)
- No built-in persistence
- Stateless API calls (sends all messages each time)

**Message Format**:
```typescript
interface UIMessage {
  id: string
  role: "user" | "assistant" | "system"
  content: string
  parts?: Array<{
    type: "text" | "tool-call" | "reasoning" | "code" | "source-url"
    // ... part-specific data
  }>
}
```

### API Route Behavior

**Location**: `app/api/ai/assistant/route.ts`

**Stateless Design**:
```typescript
export async function POST(request: Request) {
  const body = await request.json()
  const { messages: rawMessages } = body
  
  // Processes messages from request body
  // Does NOT store messages server-side
  // Returns streaming response
}
```

**Each Request**:
- Receives **all messages** in request body
- Processes conversation context
- Returns new assistant response
- **Does not persist** messages

---

## 🎨 Why Ephemeral?

### Current Design Rationale

1. **Simplicity**: No database schema needed
2. **Privacy**: Messages not stored anywhere
3. **Performance**: No persistence overhead
4. **Stateless**: API route is stateless (easier to scale)

### Trade-offs

**Pros**:
- ✅ Simple implementation
- ✅ Privacy-friendly (no stored data)
- ✅ Fast (no DB queries)
- ✅ No schema management

**Cons**:
- ❌ Messages lost on refresh
- ❌ No conversation history
- ❌ Can't resume conversations
- ❌ No cross-device sync

---

## 🚀 Adding Persistence (Future Options)

### Option 1: Client-Side Storage (localStorage)

**Implementation**:
```typescript
// Save messages to localStorage
useEffect(() => {
  if (messages.length > 0) {
    localStorage.setItem('chat-messages', JSON.stringify(messages))
  }
}, [messages])

// Load messages on mount
useEffect(() => {
  const saved = localStorage.getItem('chat-messages')
  if (saved) {
    const parsed = JSON.parse(saved)
    setMessages(parsed)
  }
}, [])
```

**Pros**:
- ✅ Survives page refresh
- ✅ Simple to implement
- ✅ No server changes needed

**Cons**:
- ❌ Limited to browser/device
- ❌ May lose complex parts (tool calls, etc.)
- ❌ Storage limits (~5-10MB)
- ❌ Not shared across devices

### Option 2: Session Storage

**Implementation**:
```typescript
// Same as localStorage but uses sessionStorage
sessionStorage.setItem('chat-messages', JSON.stringify(messages))
```

**Difference**:
- Clears when **tab closes** (not just refresh)
- Still device-specific

### Option 3: Server-Side Persistence (Recommended)

**Implementation**:
```typescript
// In API route - after response completes
export async function POST(request: Request) {
  // ... process messages ...
  
  // After streaming completes
  await supabase
    .from('chat_messages')
    .insert({
      user_id: user.id,
      conversation_id: conversationId,
      messages: allMessages, // Store full UIMessage[]
      created_at: new Date(),
    })
}

// Load on mount
useEffect(() => {
  const loadConversation = async () => {
    const { data } = await supabase
      .from('chat_messages')
      .where('conversation_id', conversationId)
      .select('messages')
    
    if (data?.[0]?.messages) {
      setMessages(data[0].messages)
    }
  }
  loadConversation()
}, [])
```

**Pros**:
- ✅ Survives refresh/navigation
- ✅ Cross-device sync
- ✅ Full message fidelity
- ✅ Conversation history

**Cons**:
- ❌ Requires database schema
- ❌ More complex implementation
- ❌ Privacy considerations
- ❌ Storage costs

---

## 📋 Current State Summary

| Aspect | Status |
|--------|--------|
| **Storage Type** | Ephemeral (in-memory) |
| **Persistence** | ❌ None |
| **Survives Refresh** | ❌ No |
| **Survives Tab Close** | ❌ No |
| **Cross-Device** | ❌ No |
| **Privacy** | ✅ High (no stored data) |
| **Complexity** | ✅ Low |

---

## 🔍 Verification

### How to Test

1. **Open chat** → Send a message
2. **Refresh page** → Messages are gone ❌
3. **Close tab** → Messages are gone ❌
4. **Navigate away** → Messages are gone ❌

### Check Console

```typescript
// In base-chat-interface.tsx
console.log("[BaseChatInterface] Messages:", messages)
// Messages array exists only while component mounted
```

---

## 💡 Recommendations

### For Current Use Case

**Ephemeral is fine if**:
- ✅ Privacy is important
- ✅ Conversations are short-lived
- ✅ No need for history
- ✅ Simple implementation preferred

### When to Add Persistence

**Consider persistence if**:
- ❌ Users need conversation history
- ❌ Long conversations need to be resumed
- ❌ Cross-device sync needed
- ❌ Analytics/audit trail required

---

## 🎯 Next Steps (If Adding Persistence)

1. **Decide on storage**:
   - Client-side (localStorage) for simple cases
   - Server-side (Supabase) for full features

2. **Design schema** (if server-side):
   ```sql
   CREATE TABLE chat_messages (
     id UUID PRIMARY KEY,
     user_id UUID REFERENCES auth.users,
     conversation_id UUID,
     messages JSONB, -- Full UIMessage[]
     created_at TIMESTAMP,
     updated_at TIMESTAMP
   );
   ```

3. **Implement persistence**:
   - Save after each response
   - Load on component mount
   - Handle serialization carefully

4. **Add conversation management**:
   - Create new conversations
   - List past conversations
   - Resume conversations

---

**Last Updated**: January 18, 2026  
**Status**: ✅ **EPHEMERAL** - No persistence currently implemented
