/**
 * Push draft state from Supabase to Notion (optional two-way sync)
 *
 * When a draft pick is recorded, this updates the corresponding Notion Draft Board
 * page to Status = "Drafted" so admins can see progress in Notion.
 *
 * Requires: NOTION_API_KEY, and notion_mappings must have been populated by
 * the Notion → Supabase draft board sync (entity_type = 'draft_pool').
 */

import type { SupabaseClient } from "@supabase/supabase-js"
import { createNotionClient, updatePage } from "@/lib/notion/client"

/**
 * Update the Notion Draft Board page for a given draft_pool row to Status = "Drafted".
 * No-op if NOTION_API_KEY is missing, or no notion_mapping exists for this row.
 */
export async function pushDraftStateToNotion(
  supabase: SupabaseClient,
  params: { season_id: string; pokemon_name: string; point_value: number }
): Promise<{ updated: boolean; error?: string }> {
  if (!process.env.NOTION_API_KEY) {
    return { updated: false }
  }

  const { season_id, pokemon_name, point_value } = params

  const { data: row, error: rowError } = await supabase
    .from("draft_pool")
    .select("id")
    .eq("season_id", season_id)
    .eq("pokemon_name", pokemon_name)
    .eq("point_value", point_value)
    .eq("status", "drafted")
    .limit(1)
    .maybeSingle()

  if (rowError || !row?.id) {
    return { updated: false, error: rowError?.message ?? "draft_pool row not found" }
  }

  const { data: mapping, error: mapError } = await supabase
    .from("notion_mappings")
    .select("notion_page_id")
    .eq("entity_type", "draft_pool")
    .eq("entity_id", row.id)
    .limit(1)
    .maybeSingle()

  if (mapError || !mapping?.notion_page_id) {
    return { updated: false }
  }

  try {
    const notion = createNotionClient()
    await updatePage(notion, mapping.notion_page_id, {
      properties: {
        Status: {
          select: { name: "Drafted" },
        },
      },
    })
    return { updated: true }
  } catch (err: any) {
    return { updated: false, error: err?.message ?? String(err) }
  }
}
