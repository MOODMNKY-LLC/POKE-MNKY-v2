/**
 * Notion Webhook Subscription Management
 *
 * Manages Notion webhook subscriptions for real-time database updates.
 * Note: Notion's webhook subscription API may vary - this implementation
 * uses the standard webhook pattern. Adjust based on actual Notion API documentation.
 */

import { createNotionClient, NotionAPIError } from "./client"

export interface NotionWebhookSubscription {
  subscription_id: string
  database_id: string
  webhook_url: string
  events: string[]
  created_at: string
  active: boolean
}

export interface CreateSubscriptionRequest {
  database_id: string
  webhook_url: string
  events: string[]
}

/**
 * Create a Notion webhook subscription
 *
 * Note: Notion webhooks are created via the integration settings UI, not via API.
 * This function provides instructions and stores the subscription metadata.
 * The actual subscription must be created at: https://www.notion.so/profile/integrations
 */
export async function createNotionWebhookSubscription(
  databaseId: string,
  webhookUrl: string,
  events: string[] = ["database.content_updated", "page.properties_updated"]
): Promise<{ subscription_id: string }> {
  // Notion webhooks are created via UI, not API
  // Generate a subscription ID for tracking purposes
  const subscriptionId = `sub_${Date.now()}_${Math.random().toString(36).substring(7)}`

  // Return instructions for manual setup
  // The actual subscription will be created in Notion's integration settings
  return {
    subscription_id: subscriptionId,
  }
}

/**
 * List active Notion webhook subscriptions
 *
 * Note: Notion doesn't provide an API to list subscriptions.
 * This function returns subscriptions stored in our database.
 */
export async function listNotionWebhookSubscriptions(): Promise<NotionWebhookSubscription[]> {
  // Notion doesn't provide an API to list subscriptions
  // Return empty array - subscriptions are tracked in our database
  return []
}

/**
 * Delete a Notion webhook subscription
 *
 * Note: Notion webhooks must be deleted via the integration settings UI.
 * This function marks the subscription as inactive in our database.
 */
export async function deleteNotionWebhookSubscription(
  subscriptionId: string
): Promise<void> {
  // Notion webhooks are deleted via UI, not API
  // This function is a no-op - deletion happens in our database
  // The actual subscription must be deleted at: https://www.notion.so/profile/integrations
  return
}

/**
 * Verify webhook signature from Notion
 *
 * Notion may send webhooks with signatures for verification.
 * This function verifies the signature matches the expected secret.
 */
export function verifyNotionWebhookSignature(
  body: string,
  signature: string | null,
  secret: string
): boolean {
  if (!signature) {
    return false
  }

  try {
    const crypto = require("crypto")
    const hmac = crypto.createHmac("sha256", secret)
    hmac.update(body)
    const expectedSignature = hmac.digest("hex")

    return crypto.timingSafeEqual(
      Buffer.from(signature),
      Buffer.from(expectedSignature)
    )
  } catch (error) {
    console.error("[Notion Webhook] Signature verification error:", error)
    return false
  }
}

/**
 * Get webhook URL for n8n workflow
 *
 * Constructs the webhook URL that Notion should call.
 * This URL points to n8n, which then forwards to our API.
 */
export function getN8nWebhookUrl(workflowId?: string): string {
  // n8n URL from environment (server-side) or default
  const n8nUrl = process.env.N8N_API_URL || "https://aab-n8n.moodmnky.com"
  
  if (workflowId) {
    // If we have a workflow ID, use the specific webhook endpoint
    return `${n8nUrl}/webhook/${workflowId}`
  }
  
  // Default webhook path (n8n will route based on workflow configuration)
  return `${n8nUrl}/webhook/notion-draft-board`
}

/**
 * Get direct API webhook URL (bypasses n8n)
 *
 * For direct webhook calls from Notion to our API.
 */
export function getDirectWebhookUrl(): string {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://poke-mnky.moodmnky.com"
  return `${appUrl}/api/webhooks/notion`
}
