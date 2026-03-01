/**
 * POKE MNKY v3: Notion webhook payload validation
 * Minimal schema for POST /api/webhooks/notion
 */

import { z } from "zod"

/** Verification request during Notion webhook subscription setup */
export const notionVerificationPayloadSchema = z.object({
  verification_token: z.string(),
})

/** Webhook event payload (after verification) */
export const notionWebhookPayloadSchema = z.object({
  type: z.string(),
  data: z
    .object({
      database_id: z.string().optional(),
    })
    .optional(),
  database_id: z.string().optional(),
})

export type NotionWebhookPayload = z.infer<typeof notionWebhookPayloadSchema>
