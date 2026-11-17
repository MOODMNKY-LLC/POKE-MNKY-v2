/**
 * POKE MNKY v3: Notion webhook payload validation
 * Minimal schema for POST /api/webhooks/notion
 */

import { z } from "zod"

/** Verification request during Notion webhook subscription setup */
export const notionVerificationPayloadSchema = z.object({
  verification_token: z.string(),
})

const optionalId = z.string().nullish()

/**
 * Webhook event payload (after signature verification). Covers the current Notion shapes:
 * `{ id, timestamp, type, entity: { id, type }, data: { parent: { id, type, data_source_id } } }`
 * and the legacy `data.database_id` / `database_id` form.
 */
export const notionWebhookPayloadSchema = z
  .object({
    id: z.string().nullish(),
    timestamp: z.string().nullish(),
    type: z.string(),
    entity: z.object({ id: optionalId, type: z.string().nullish() }).passthrough().nullish(),
    data: z
      .object({
        database_id: optionalId,
        parent: z
          .object({ id: optionalId, type: z.string().nullish(), data_source_id: optionalId })
          .passthrough()
          .nullish(),
      })
      .passthrough()
      .nullish(),
    database_id: optionalId,
  })
  .passthrough()

export type NotionWebhookPayload = z.infer<typeof notionWebhookPayloadSchema>
