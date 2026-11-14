import type { SupabaseClient } from "@supabase/supabase-js"
import { createClient } from "@/lib/supabase/client"
import type {
  DraftPoolEntrySnapshot,
  DraftPoolRestrictionSnapshot,
} from "@/lib/draft-pool-builder/diff"

export type DraftPoolSeason = {
  id: string
  name: string
  is_current: boolean | null
}

export type DraftPoolVersion = {
  id: string
  season_id: string
  status: "published" | "pending" | "archived"
  created_by: string | null
  submitted_by: string | null
  approved_by: string | null
  notes: string | null
  created_at: string
  updated_at: string
  submitted_at: string | null
  approved_at: string | null
  archived_at: string | null
  based_on_version_id: string | null
  contributor_ids: string[]
  published_at: string | null
}

export type DraftPoolEditorAccess = {
  userId: string
  isEditor: boolean
  isAdmin: boolean
}

export type DraftPoolEditorSnapshot = {
  published: DraftPoolVersion | null
  pending: DraftPoolVersion | null
  publishedEntries: DraftPoolEntrySnapshot[]
  pendingEntries: DraftPoolEntrySnapshot[]
  publishedRestrictions: DraftPoolRestrictionSnapshot[]
  pendingRestrictions: DraftPoolRestrictionSnapshot[]
}

export type PokemonLookup = {
  id: number
  name: string
}

function browserClient() {
  return createClient() as SupabaseClient
}

function throwIfError(error: { message: string } | null) {
  if (error) throw new Error(error.message)
}

export async function getDraftPoolEditorAccess(
  client: SupabaseClient = browserClient(),
): Promise<DraftPoolEditorAccess | null> {
  const { data: auth, error: authError } = await client.auth.getUser()
  throwIfError(authError)
  if (!auth.user) return null

  const [editor, admin] = await Promise.all([
    client.rpc("is_draft_pool_editor"),
    client.rpc("is_draft_pool_admin"),
  ])
  throwIfError(editor.error)
  throwIfError(admin.error)
  return {
    userId: auth.user.id,
    isEditor: editor.data === true,
    isAdmin: admin.data === true,
  }
}

export async function listDraftPoolSeasons(
  client: SupabaseClient = browserClient(),
): Promise<DraftPoolSeason[]> {
  const { data, error } = await client
    .from("seasons")
    .select("id, name, is_current")
    .order("is_current", { ascending: false })
    .order("name", { ascending: false })
  throwIfError(error)
  return (data ?? []) as DraftPoolSeason[]
}

export async function loadDraftPoolEditorSnapshot(
  seasonId: string,
  client: SupabaseClient = browserClient(),
): Promise<DraftPoolEditorSnapshot> {
  const versionsResult = await client
    .from("draft_pool_versions")
    .select(
      "id, season_id, status, created_by, submitted_by, approved_by, notes, created_at, updated_at, submitted_at, approved_at, archived_at, based_on_version_id, contributor_ids, published_at",
    )
    .eq("season_id", seasonId)
    .in("status", ["published", "pending"])
  throwIfError(versionsResult.error)

  const versions = (versionsResult.data ?? []) as DraftPoolVersion[]
  const published = versions.find((version) => version.status === "published") ?? null
  const pending = versions.find((version) => version.status === "pending") ?? null
  const versionIds = [published?.id, pending?.id].filter(
    (id): id is string => Boolean(id),
  )
  if (versionIds.length === 0) {
    return {
      published,
      pending,
      publishedEntries: [],
      pendingEntries: [],
      publishedRestrictions: [],
      pendingRestrictions: [],
    }
  }

  const [entriesResult, restrictionsResult] = await Promise.all([
    client
      .from("draft_pool_version_entries")
      .select(
        "id, version_id, pokemon_id, sheet_name, points, status, tera_banned, is_effective_tera_ban, sort_order",
      )
      .in("version_id", versionIds)
      .order("sort_order")
      .order("sheet_name"),
    client
      .from("season_pokemon_restrictions")
      .select("id, version_id, pokemon_id, sheet_name, kind, name, note")
      .in("version_id", versionIds)
      .order("kind")
      .order("name"),
  ])
  throwIfError(entriesResult.error)
  throwIfError(restrictionsResult.error)
  const entries = (entriesResult.data ?? []) as DraftPoolEntrySnapshot[]
  const restrictions = (restrictionsResult.data ?? []) as DraftPoolRestrictionSnapshot[]

  return {
    published,
    pending,
    publishedEntries: published
      ? entries.filter((entry) => entry.version_id === published.id)
      : [],
    pendingEntries: pending
      ? entries.filter((entry) => entry.version_id === pending.id)
      : [],
    publishedRestrictions: published
      ? restrictions.filter(
          (restriction) => restriction.version_id === published.id,
        )
      : [],
    pendingRestrictions: pending
      ? restrictions.filter(
          (restriction) => restriction.version_id === pending.id,
        )
      : [],
  }
}

export async function searchPokemonCatalog(
  query: string,
  client: SupabaseClient = browserClient(),
): Promise<PokemonLookup[]> {
  const term = query.trim()
  if (term.length < 2) return []
  const { data, error } = await client
    .from("pokepedia_pokemon")
    .select("id, name")
    .ilike("name", `%${term.replaceAll("%", "\\%").replaceAll("_", "\\_")}%`)
    .order("name")
    .limit(12)
  throwIfError(error)
  return (data ?? []) as PokemonLookup[]
}

export async function startDraftPoolRevision(
  seasonId: string,
  notes?: string,
  client: SupabaseClient = browserClient(),
) {
  const { data, error } = await client.rpc("rpc_draft_pool_start_revision", {
    p_season_id: seasonId,
    p_notes: notes?.trim() || null,
  })
  throwIfError(error)
  return data as string
}

export async function submitDraftPoolRevision(
  versionId: string,
  client: SupabaseClient = browserClient(),
) {
  const { error } = await client.rpc("rpc_draft_pool_submit_revision", {
    p_version_id: versionId,
    p_notes: null,
  })
  throwIfError(error)
}

export async function withdrawDraftPoolRevision(
  versionId: string,
  client: SupabaseClient = browserClient(),
) {
  const { error } = await client.rpc("rpc_draft_pool_withdraw_revision", {
    p_version_id: versionId,
  })
  throwIfError(error)
}

export async function publishDraftPoolRevision(
  versionId: string,
  client: SupabaseClient = browserClient(),
) {
  const { data, error } = await client.rpc("rpc_draft_pool_publish_revision", {
    p_version_id: versionId,
    p_notes: null,
  })
  throwIfError(error)
  return data as {
    published_version_id: string
    archived_version_id: string | null
  }
}

export async function discardDraftPoolRevision(
  versionId: string,
  client: SupabaseClient = browserClient(),
) {
  const { error } = await client.rpc("rpc_draft_pool_discard_revision", {
    p_version_id: versionId,
  })
  throwIfError(error)
}

export async function updateDraftPoolEntry(
  id: string,
  values: Pick<DraftPoolEntrySnapshot, "points" | "status" | "tera_banned">,
  client: SupabaseClient = browserClient(),
) {
  const { error } = await client
    .from("draft_pool_version_entries")
    .update(values)
    .eq("id", id)
  throwIfError(error)
}

export async function addDraftPoolEntry(
  values: Omit<
    DraftPoolEntrySnapshot,
    "id" | "is_effective_tera_ban" | "sort_order"
  >,
  client: SupabaseClient = browserClient(),
) {
  const { error } = await client.from("draft_pool_version_entries").insert({
    ...values,
    sort_order: 0,
  })
  throwIfError(error)
}

export async function removeDraftPoolEntry(
  id: string,
  client: SupabaseClient = browserClient(),
) {
  const { error } = await client
    .from("draft_pool_version_entries")
    .delete()
    .eq("id", id)
  throwIfError(error)
}

export async function addDraftPoolRestriction(
  values: Omit<DraftPoolRestrictionSnapshot, "id">,
  client: SupabaseClient = browserClient(),
) {
  const { error } = await client
    .from("season_pokemon_restrictions")
    .insert(values)
  throwIfError(error)
}

export async function removeDraftPoolRestriction(
  id: string,
  client: SupabaseClient = browserClient(),
) {
  const { error } = await client
    .from("season_pokemon_restrictions")
    .delete()
    .eq("id", id)
  throwIfError(error)
}
