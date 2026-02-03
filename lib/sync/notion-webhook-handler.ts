/**
 * Notion Webhook Handler
 *
 * Utility functions for processing Notion webhook events
 * and determining if sync is needed.
 */

export interface NotionWebhookPayload {
  type: string
  data?: {
    database_id?: string
    page_id?: string
    properties?: Record<string, any>
  }
  database_id?: string
  page_id?: string
}

export interface WebhookProcessingResult {
  shouldSync: boolean
  reason: string
  databaseId?: string
  eventType?: string
}

const DRAFT_BOARD_DATABASE_ID = "5e58ccd73ceb44ed83de826b51cf5c36"

/**
 * Process Notion webhook payload and determine if sync is needed
 */
export function processNotionWebhook(
  payload: NotionWebhookPayload
): WebhookProcessingResult {
  const eventType = payload.type
  const databaseId =
    payload.data?.database_id || payload.database_id || null

  // Only process Draft Board database
  if (databaseId !== DRAFT_BOARD_DATABASE_ID) {
    return {
      shouldSync: false,
      reason: `Database ${databaseId} is not Draft Board`,
    }
  }

  // Process relevant events
  const relevantEvents = [
    "database.content_updated",
    "page.properties_updated",
    "page.created",
  ]

  if (!relevantEvents.includes(eventType)) {
    return {
      shouldSync: false,
      reason: `Event type ${eventType} is not relevant for Draft Board sync`,
    }
  }

  return {
    shouldSync: true,
    reason: `Draft Board ${eventType} event detected`,
    databaseId,
    eventType,
  }
}

/**
 * Extract relevant information from webhook payload for logging
 */
export function extractWebhookInfo(payload: NotionWebhookPayload): {
  eventType: string
  databaseId: string | null
  pageId: string | null
  timestamp: string
} {
  return {
    eventType: payload.type,
    databaseId: payload.data?.database_id || payload.database_id || null,
    pageId: payload.data?.page_id || payload.page_id || null,
    timestamp: new Date().toISOString(),
  }
}
