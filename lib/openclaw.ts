import { OpenClawClient } from 'openclaw-node';

let client: OpenClawClient | null = null;

/**
 * Initialize the OpenClaw client.
 * Uses gateway URL and token from environment.
 */
export function initOpenClawClient() {
  if (client) return client;

  const url = process.env.OPENCLAW_GATEWAY_URL || 'ws://localhost:18789';
  const token = process.env.OPENCLAW_GATEWAY_TOKEN || undefined;

  client = new OpenClawClient({
    url,
    token,
    autoReconnect: true,
    maxReconnectAttempts: 3,
  });

  return client;
}

/**
 * Get the initialized client or throw.
 */
export function getOpenClawClient(): OpenClawClient {
  if (!client) {
    throw new Error(
      'OpenClaw client not initialized. Call initOpenClawClient() first.',
    );
  }
  return client;
}

/**
 * Run an agent and stream responses to a callback.
 */
export async function runOpenClawAgent(
  input: string,
  { sessionKey, agentId, onChunk }: { sessionKey?: string; agentId?: string; onChunk?: (chunk: any) => void },
): Promise<string> {
  const client = getOpenClawClient();
  await client.connect();

  try {
    const stream = client.chat(input, { sessionKey, agentId });

    let fullResponse = '';
    for await (const chunk of stream) {
      if (chunk.type === 'text') {
        fullResponse += chunk.text;
        onChunk?.(chunk);
      }
    }

    return fullResponse;
  } finally {
    await client.disconnect();
  }
}

/**
 * Synchronous agent run (waits for complete response).
 */
export async function runOpenClawAgentSync(
  input: string,
  { sessionKey, agentId }: { sessionKey?: string; agentId?: string } = {},
): Promise<string> {
  const client = getOpenClawClient();
  await client.connect();

  try {
    const response = await client.chatSync(input, { sessionKey, agentId });
    return response;
  } finally {
    await client.disconnect();
  }
}
