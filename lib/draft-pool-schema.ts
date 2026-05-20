import type { SupabaseClient } from "@supabase/supabase-js"
import { determineGeneration } from "@/lib/draft-board/gen9-bans-and-tiers"

let cachedHasGeneration: boolean | null = null

/** Some environments dropped draft_pool.generation (see 20260119105458_remote_schema). */
export async function draftPoolHasGenerationColumn(
  service: SupabaseClient
): Promise<boolean> {
  if (cachedHasGeneration !== null) return cachedHasGeneration
  const { error } = await service.from("draft_pool").select("generation").limit(1)
  if (error && /generation.*does not exist/i.test(error.message)) {
    cachedHasGeneration = false
    return false
  }
  cachedHasGeneration = true
  return true
}

export function resetDraftPoolSchemaCache(): void {
  cachedHasGeneration = null
}
