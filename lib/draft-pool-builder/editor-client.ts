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

function isFunction(value: unknown): value is (...args: unknown[]) => unknown {
  return typeof value === "function"
}

function looksLikeSupabaseClient(value: unknown): value is SupabaseClient {
  if (typeof value !== "object" || value === null) return false
  const candidate = value as { auth?: unknown; rpc?: unknown; from?: unknown }
  const auth = candidate.auth as { getUser?: unknown } | null | undefined
  return (
    typeof auth === "object" &&
    auth !== null &&
    isFunction(auth.getUser) &&
    isFunction(candidate.rpc) &&
    isFunction(candidate.from)
  )
}

/**
 * SWR calls fetchers with the cache key as the first argument, so a loader
 * passed straight to useSWR receives a string where it expects a client.
 * Only trust the argument when it actually looks like a Supabase client.
 */
export function resolveClient(client?: unknown): SupabaseClient {
  return looksLikeSupabaseClient(client) ? client : browserClient()
}

function throwIfError(error: { message: string } | null) {
  if (error) throw new Error(error.message)
}

export async function getDraftPoolEditorAccess(
  clientArg?: unknown,
): Promise<DraftPoolEditorAccess | null> {
  const client = resolveClient(clientArg)
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
  clientArg?: unknown,
): Promise<DraftPoolSeason[]> {
  const client = resolveClient(clientArg)
  const { data, error } = await client
    .from("seasons")
    .select("id, name, is_current")
    .order("is_current", { ascending: false })
    .order("name", { ascending: false })
  throwIfError(error)
  return (data ?? []) as DraftPoolSeason[]
}

const SNAPSHOT_PAGE_SIZE = 1_000

async function fetchVersionEntries(
  client: SupabaseClient,
  versionId: string,
): Promise<DraftPoolEntrySnapshot[]> {
  const entries: DraftPoolEntrySnapshot[] = []

  for (let from = 0; ; from += SNAPSHOT_PAGE_SIZE) {
    const { data, error } = await client
      .from("draft_pool_version_entries")
      .select(
        "id, version_id, pokemon_id, sheet_name, points, status, tera_banned, is_effective_tera_ban, sort_order",
      )
      .eq("version_id", versionId)
      .order("sort_order")
      .order("sheet_name")
      .order("id")
      .range(from, from + SNAPSHOT_PAGE_SIZE - 1)
    throwIfError(error)

    const page = (data ?? []) as DraftPoolEntrySnapshot[]
    entries.push(...page)
    if (page.length < SNAPSHOT_PAGE_SIZE) break
  }

  return entries
}

async function fetchVersionRestrictions(
  client: SupabaseClient,
  versionId: string,
): Promise<DraftPoolRestrictionSnapshot[]> {
  const restrictions: DraftPoolRestrictionSnapshot[] = []

  for (let from = 0; ; from += SNAPSHOT_PAGE_SIZE) {
    const { data, error } = await client
      .from("season_pokemon_restrictions")
      .select("id, version_id, pokemon_id, sheet_name, kind, name, note")
      .eq("version_id", versionId)
      .order("kind")
      .order("name")
      .order("id")
      .range(from, from + SNAPSHOT_PAGE_SIZE - 1)
    throwIfError(error)

    const page = (data ?? []) as DraftPoolRestrictionSnapshot[]
    restrictions.push(...page)
    if (page.length < SNAPSHOT_PAGE_SIZE) break
  }

  return restrictions
}

export async function loadDraftPoolEditorSnapshot(
  seasonId: string,
  clientArg?: unknown,
): Promise<DraftPoolEditorSnapshot> {
  const client = resolveClient(clientArg)
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

  const [
    publishedEntries,
    pendingEntries,
    publishedRestrictions,
    pendingRestrictions,
  ] = await Promise.all([
    published
      ? fetchVersionEntries(client, published.id)
      : Promise.resolve([] as DraftPoolEntrySnapshot[]),
    pending
      ? fetchVersionEntries(client, pending.id)
      : Promise.resolve([] as DraftPoolEntrySnapshot[]),
    published
      ? fetchVersionRestrictions(client, published.id)
      : Promise.resolve([] as DraftPoolRestrictionSnapshot[]),
    pending
      ? fetchVersionRestrictions(client, pending.id)
      : Promise.resolve([] as DraftPoolRestrictionSnapshot[]),
  ])

  return {
    published,
    pending,
    publishedEntries,
    pendingEntries,
    publishedRestrictions,
    pendingRestrictions,
  }
}

export async function searchPokemonCatalog(
  query: string,
  clientArg?: unknown,
): Promise<PokemonLookup[]> {
  const client = resolveClient(clientArg)
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
  clientArg?: unknown,
) {
  const client = resolveClient(clientArg)
  const { data, error } = await client.rpc("rpc_draft_pool_start_revision", {
    p_season_id: seasonId,
    p_notes: notes?.trim() || null,
  })
  throwIfError(error)
  return data as string
}

export async function submitDraftPoolRevision(
  versionId: string,
  clientArg?: unknown,
) {
  const client = resolveClient(clientArg)
  const { error } = await client.rpc("rpc_draft_pool_submit_revision", {
    p_version_id: versionId,
    p_notes: null,
  })
  throwIfError(error)
}

export async function withdrawDraftPoolRevision(
  versionId: string,
  clientArg?: unknown,
) {
  const client = resolveClient(clientArg)
  const { error } = await client.rpc("rpc_draft_pool_withdraw_revision", {
    p_version_id: versionId,
  })
  throwIfError(error)
}

export async function publishDraftPoolRevision(
  versionId: string,
  clientArg?: unknown,
) {
  const client = resolveClient(clientArg)
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
  clientArg?: unknown,
) {
  const client = resolveClient(clientArg)
  const { error } = await client.rpc("rpc_draft_pool_discard_revision", {
    p_version_id: versionId,
  })
  throwIfError(error)
}

export async function updateDraftPoolEntry(
  id: string,
  values: Pick<DraftPoolEntrySnapshot, "points" | "status" | "tera_banned">,
  clientArg?: unknown,
) {
  const client = resolveClient(clientArg)
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
  clientArg?: unknown,
) {
  const client = resolveClient(clientArg)
  const { error } = await client.from("draft_pool_version_entries").insert({
    ...values,
    sort_order: 0,
  })
  throwIfError(error)
}

export async function removeDraftPoolEntry(
  id: string,
  clientArg?: unknown,
) {
  const client = resolveClient(clientArg)
  const { error } = await client
    .from("draft_pool_version_entries")
    .delete()
    .eq("id", id)
  throwIfError(error)
}

export async function addDraftPoolRestriction(
  values: Omit<DraftPoolRestrictionSnapshot, "id">,
  clientArg?: unknown,
) {
  const client = resolveClient(clientArg)
  const { error } = await client
    .from("season_pokemon_restrictions")
    .insert(values)
  throwIfError(error)
}

export async function removeDraftPoolRestriction(
  id: string,
  clientArg?: unknown,
) {
  const client = resolveClient(clientArg)
  const { error } = await client
    .from("season_pokemon_restrictions")
    .delete()
    .eq("id", id)
  throwIfError(error)
}

export const DRAFT_POOL_EDITOR_ACCESS_KEY = "draft-pool-editor-access"
export const DRAFT_POOL_EDITOR_SEASONS_KEY = "draft-pool-editor-seasons"

/** SWR-safe: ignores the key SWR passes as the first argument. */
export const draftPoolEditorAccessFetcher = () => getDraftPoolEditorAccess()

/** SWR-safe: ignores the key SWR passes as the first argument. */
export const draftPoolSeasonsFetcher = () => listDraftPoolSeasons()
