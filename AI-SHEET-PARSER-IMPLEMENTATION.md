# AI-Powered Google Sheets Parser Implementation

## Overview

We've implemented an AI-powered parser using OpenAI GPT-5.2 models to intelligently extract and infer missing fields from unstructured Google Sheets data.

## Technology Stack

### Current Implementation
- **OpenAI SDK**: v4.77.3 (with `zodResponseFormat` helper)
- **Zod**: v3.25.76 (for schema validation and type safety)
- **Model**: GPT-5.2 (`STRATEGY_COACH`) for complex reasoning

### Why This Approach?

1. **Zod + zodResponseFormat**: 
   - Type-safe schema definitions
   - Automatic JSON Schema conversion
   - Runtime validation
   - Better than manual JSON schemas

2. **Direct API Calls vs Agents SDK**:
   - **Current approach** (Direct API): Better for single-step parsing tasks
   - **Agents SDK** (`@openai/agents`): Better for multi-step workflows, tool calling, agent handoffs
   - For our use case (parsing sheet data), direct API calls are more efficient

## Key Features

### 1. Intelligent Field Inference
- **Geographic patterns**: Infers divisions from team locations
- **Theme-based grouping**: Groups teams by naming patterns
- **Consistency**: Maintains consistency with existing teams
- **Balancing**: Distributes teams evenly across divisions/conferences

### 2. Type Safety
- Zod schemas provide compile-time and runtime type safety
- Automatic validation of AI responses
- Clear error messages for invalid data

### 3. Confidence Scoring
- Each parsed record includes confidence (0-1)
- Tracks which fields were inferred vs extracted
- Provides warnings for low-confidence inferences

## Implementation Details

### Schema Definition
\`\`\`typescript
const ParsedTeamDataSchema = z.object({
  name: z.string(),
  coach_name: z.string(),
  division: z.string(),
  conference: z.string(),
  wins: z.number().int().default(0),
  losses: z.number().int().default(0),
  differential: z.number().int().default(0),
  strength_of_schedule: z.number().default(0),
  confidence: z.number().min(0).max(1),
  inferred_fields: z.array(z.string()).optional(),
  warnings: z.array(z.string()).optional(),
})
\`\`\`

### Usage
\`\`\`typescript
const responseFormat = zodResponseFormat(ParsedTeamsResponseSchema, "parsed_teams")

const response = await openai.chat.completions.create({
  model: AI_MODELS.STRATEGY_COACH,
  messages: [...],
  response_format: responseFormat,
  temperature: 0.3,
})
\`\`\`

## Alternative Approaches Considered

### 1. OpenAI Agents SDK (`@openai/agents`)
**Pros:**
- Built-in agent loop
- Tool calling capabilities
- Multi-step reasoning
- Handoffs between agents

**Cons:**
- Overkill for single-step parsing
- More complex setup
- Additional dependency
- Slower for simple tasks

**Verdict**: Not needed for current use case, but could be useful if we need:
- Multi-step analysis (e.g., first analyze structure, then parse)
- Tool calling during parsing
- Complex workflows with multiple agents

### 2. Manual JSON Schema
**Pros:**
- Full control
- No dependencies

**Cons:**
- Error-prone (as we saw with `additionalProperties`)
- No type safety
- More verbose

**Verdict**: Zod + zodResponseFormat is superior

### 3. Other Packages
- `public-google-sheets-parser`: For public sheets only
- `parse-googlesheets`: Less flexible than our AI approach
- `spreadsheet-to-json`: Doesn't handle unstructured data well

**Verdict**: Our AI-powered approach is more flexible and intelligent

## Future Enhancements

### Potential Improvements
1. **Caching**: Cache AI responses for identical sheet structures
2. **Retry Logic**: Retry with different prompts on failure
3. **Batch Processing**: Process large sheets in batches
4. **Two-Step Parsing**: 
   - Step 1: Analyze sheet structure
   - Step 2: Parse with structure-aware prompts
5. **Agents SDK Integration**: If we need multi-step reasoning

### When to Consider Agents SDK
- Need to analyze sheet structure first, then parse
- Require tool calling (e.g., lookup team info from database)
- Complex workflows with multiple parsing steps
- Need to coordinate multiple parsing agents

## Current Status

✅ Zod schemas implemented
✅ zodResponseFormat integration
✅ Enhanced prompts with geographic inference
✅ Type-safe parsing with validation
✅ Error handling and fallbacks

## Testing

The parser will automatically activate when:
- Headers are invalid (like "Week 14")
- More than 5 rows need parsing
- Raw cell access is required

Check console logs for:
- `[Sync] syncTeams: Using AI-powered parsing for X rows`
- `[Sync] syncTeams: AI parsed X teams`
- `[Sync] syncTeams: AI inferred fields for "Team Name": [...]`
