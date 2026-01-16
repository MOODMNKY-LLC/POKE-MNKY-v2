# Sync Continuation Explanation

## Current Behavior

**The sync is NOT set to continue until complete by default.**

From the logs:
\`\`\`json
{
  "action": "start",
  "phase": "master",
  "priority": "critical",
  "continueUntilComplete": false  // ← Currently false
}
\`\`\`

## How Sync Works

### Mode 1: Chunk-by-Chunk (Default)
- **Behavior**: Processes ONE chunk per request
- **Continuation**: Relies on cron job to process remaining chunks
- **Use Case**: Better for long-running syncs, avoids Edge Function timeouts
- **Current Setting**: `continueUntilComplete: false`

### Mode 2: Continue Until Complete
- **Behavior**: Processes multiple chunks in a loop
- **Limits**: 
  - Maximum 50 seconds execution time (to avoid Edge Function timeout)
  - If timeout reached, cron continues the rest
- **Use Case**: Faster completion for smaller syncs
- **Setting**: `continueUntilComplete: true`

## Code Logic

\`\`\`typescript
if (continueUntilComplete && !result.completed) {
  // Process chunks in a loop until:
  // 1. Job completes (all chunks processed)
  // 2. OR 50-second timeout reached
  while (!result.completed && (Date.now() - startTime) < MAX_EXECUTION_TIME_MS) {
    result = await processChunk(supabase, updatedJob)
    chunksProcessed++
    // ... delay between chunks ...
  }
  
  if (!result.completed && timeout) {
    console.log("Timeout reached, job will continue via cron")
  }
}
\`\`\`

## To Enable Continue Until Complete

When triggering the sync, set `continueUntilComplete: true`:

\`\`\`bash
curl -X POST http://127.0.0.1:54321/functions/v1/sync-pokepedia \
  -H "Content-Type: application/json" \
  -d '{
    "action": "start",
    "phase": "master",
    "priority": "critical",
    "continueUntilComplete": true
  }'
\`\`\`

## Current Running Job

The current job (`3fbc2c57-ec37-4d09-a9b1-5b289833e175`) is:
- **Status**: Running
- **Chunks Processed**: 1
- **Mode**: Chunk-by-chunk (relying on cron)
- **Will Complete**: When cron processes all remaining chunks

## Recommendation

For **local development/testing**: Use `continueUntilComplete: true` for faster completion.

For **production**: Keep `continueUntilComplete: false` to avoid Edge Function timeouts on large syncs.
