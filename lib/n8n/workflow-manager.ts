/**
 * n8n Workflow Manager
 *
 * Programmatic management of n8n workflows via API.
 * Used to create, update, and monitor workflows for Notion sync automation.
 */

import axios, { AxiosInstance } from "axios"

export interface N8nWorkflow {
  id?: string
  name: string
  active: boolean
  nodes: N8nNode[]
  connections: Record<string, any>
  settings?: Record<string, any>
}

export interface N8nNode {
  id: string
  name: string
  type: string
  typeVersion: number
  position: [number, number]
  parameters: Record<string, any>
}

export interface N8nWorkflowExecution {
  id: string
  finished: boolean
  mode: string
  startedAt: string
  stoppedAt?: string
  workflowId: string
  status: "success" | "error" | "waiting" | "running"
}

/**
 * Create n8n API client
 */
function createN8nClient(): AxiosInstance {
  const apiUrl = process.env.N8N_API_URL
  const apiKey = process.env.N8N_API_KEY

  if (!apiUrl || !apiKey) {
    throw new Error("N8N_API_URL and N8N_API_KEY environment variables are required")
  }

  return axios.create({
    baseURL: apiUrl,
    headers: {
      "X-N8N-API-KEY": apiKey,
      "Content-Type": "application/json",
    },
    timeout: 30000,
  })
}

/**
 * Create a workflow in n8n
 */
export async function createN8nWorkflow(workflow: N8nWorkflow): Promise<{ id: string }> {
  const client = createN8nClient()

  try {
    const response = await client.post("/api/v1/workflows", workflow)
    return { id: response.data.id }
  } catch (error: any) {
    throw new Error(
      `Failed to create n8n workflow: ${error.response?.data?.message || error.message}`
    )
  }
}

/**
 * Get workflow by ID
 */
export async function getN8nWorkflow(workflowId: string): Promise<N8nWorkflow> {
  const client = createN8nClient()

  try {
    const response = await client.get(`/api/v1/workflows/${workflowId}`)
    return response.data
  } catch (error: any) {
    throw new Error(
      `Failed to get n8n workflow: ${error.response?.data?.message || error.message}`
    )
  }
}

/**
 * Update workflow
 */
export async function updateN8nWorkflow(
  workflowId: string,
  updates: Partial<N8nWorkflow>
): Promise<N8nWorkflow> {
  const client = createN8nClient()

  try {
    const response = await client.put(`/api/v1/workflows/${workflowId}`, updates)
    return response.data
  } catch (error: any) {
    throw new Error(
      `Failed to update n8n workflow: ${error.response?.data?.message || error.message}`
    )
  }
}

/**
 * Activate workflow
 */
export async function activateN8nWorkflow(workflowId: string): Promise<void> {
  const client = createN8nClient()

  try {
    await client.post(`/api/v1/workflows/${workflowId}/activate`)
  } catch (error: any) {
    throw new Error(
      `Failed to activate n8n workflow: ${error.response?.data?.message || error.message}`
    )
  }
}

/**
 * Deactivate workflow
 */
export async function deactivateN8nWorkflow(workflowId: string): Promise<void> {
  const client = createN8nClient()

  try {
    await client.post(`/api/v1/workflows/${workflowId}/deactivate`)
  } catch (error: any) {
    throw new Error(
      `Failed to deactivate n8n workflow: ${error.response?.data?.message || error.message}`
    )
  }
}

/**
 * List workflows
 */
export async function listN8nWorkflows(): Promise<N8nWorkflow[]> {
  const client = createN8nClient()

  try {
    const response = await client.get("/api/v1/workflows")
    return response.data.data || response.data || []
  } catch (error: any) {
    throw new Error(
      `Failed to list n8n workflows: ${error.response?.data?.message || error.message}`
    )
  }
}

/**
 * Get workflow executions
 */
export async function getN8nWorkflowExecutions(
  workflowId: string,
  limit: number = 10
): Promise<N8nWorkflowExecution[]> {
  const client = createN8nClient()

  try {
    const response = await client.get(`/api/v1/executions`, {
      params: {
        workflowId,
        limit,
      },
    })
    return response.data.data || response.data || []
  } catch (error: any) {
    throw new Error(
      `Failed to get n8n workflow executions: ${error.response?.data?.message || error.message}`
    )
  }
}

/**
 * Create Notion Draft Board Sync Workflow
 *
 * Creates a workflow that:
 * 1. Receives webhooks from Notion
 * 2. Filters for Draft Board database events
 * 3. Calls /api/sync/notion/pull
 * 4. Sends Discord notification on success/error
 */
export async function createNotionSyncWorkflow(
  webhookUrl: string,
  syncApiUrl: string,
  discordWebhookUrl?: string
): Promise<{ workflowId: string; webhookUrl: string }> {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://poke-mnky.moodmnky.com"
  const syncSecret = process.env.NOTION_SYNC_SECRET

  if (!syncSecret) {
    throw new Error("NOTION_SYNC_SECRET environment variable is required")
  }

  // Build workflow nodes
  const nodes: N8nNode[] = [
    // Webhook trigger
    {
      id: "webhook-trigger",
      name: "Notion Webhook",
      type: "n8n-nodes-base.webhook",
      typeVersion: 1,
      position: [250, 300],
      parameters: {
        httpMethod: "POST",
        path: "notion-draft-board",
        responseMode: "responseNode",
        options: {},
      },
    },
    // IF node: Filter Draft Board database
    {
      id: "filter-draft-board",
      name: "Filter Draft Board",
      type: "n8n-nodes-base.if",
      typeVersion: 1,
      position: [450, 300],
      parameters: {
        conditions: {
          string: [
            {
              value1: "={{ $json.body.data?.database_id || $json.body.database_id }}",
              operation: "equals",
              value2: "5e58ccd73ceb44ed83de826b51cf5c36",
            },
          ],
        },
      },
    },
    // HTTP Request: Trigger sync
    {
      id: "trigger-sync",
      name: "Trigger Sync",
      type: "n8n-nodes-base.httpRequest",
      typeVersion: 4.1,
      position: [650, 300],
      parameters: {
        method: "POST",
        url: syncApiUrl || `${appUrl}/api/sync/notion/pull`,
        authentication: "headerAuth",
        sendHeaders: true,
        headerParameters: {
          parameters: [
            {
              name: "Authorization",
              value: `Bearer ${syncSecret}`,
            },
          ],
        },
        sendBody: true,
        specifyBody: "json",
        jsonBody: JSON.stringify({
          scope: ["draft_board"],
          incremental: true,
          since: "={{ $now.minus({ minutes: 5 }).toISO() }}",
        }),
        options: {},
      },
    },
  ]

  // Add Discord notification node if webhook URL provided
  if (discordWebhookUrl) {
    nodes.push({
      id: "discord-notify",
      name: "Discord Notification",
      type: "n8n-nodes-base.discord",
      typeVersion: 1,
      position: [850, 300],
      parameters: {
        webhookUrl: discordWebhookUrl,
        text: "={{ $json.success ? '✅ Draft board sync completed' : '❌ Draft board sync failed' }}",
        options: {},
      },
    })
  }

  // Build connections
  const connections: Record<string, any> = {
    "Notion Webhook": {
      main: [[{ node: "Filter Draft Board", type: "main", index: 0 }]],
    },
    "Filter Draft Board": {
      main: [[{ node: "Trigger Sync", type: "main", index: 0 }]],
    },
  }

  if (discordWebhookUrl) {
    connections["Trigger Sync"] = {
      main: [[{ node: "Discord Notification", type: "main", index: 0 }]],
    }
  }

  const workflow: N8nWorkflow = {
    name: "Notion Draft Board Sync",
    active: false, // Start inactive, activate after creation
    nodes,
    connections,
    settings: {
      executionOrder: "v1",
    },
  }

  const result = await createN8nWorkflow(workflow)

  // Get the webhook URL for this workflow
  const createdWorkflow = await getN8nWorkflow(result.id)
  const webhookNode = createdWorkflow.nodes.find((n) => n.type === "n8n-nodes-base.webhook")
  const actualWebhookUrl = webhookUrl || `${process.env.N8N_API_URL}/webhook/notion-draft-board`

  return {
    workflowId: result.id,
    webhookUrl: actualWebhookUrl,
  }
}
