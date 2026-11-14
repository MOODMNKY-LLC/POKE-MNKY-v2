export type DraftPoolEntrySnapshot = {
  id: string
  version_id: string
  pokemon_id: number | null
  sheet_name: string
  points: number
  status: "draftable" | "banned"
  tera_banned: boolean
  is_effective_tera_ban?: boolean
  sort_order: number
}

export type DraftPoolRestrictionSnapshot = {
  id: string
  version_id: string
  pokemon_id: number | null
  sheet_name: string | null
  kind: "move" | "ability" | "combo"
  name: string
  note: string | null
}

export type EntryChange = {
  before: DraftPoolEntrySnapshot
  after: DraftPoolEntrySnapshot
  changed: Array<"points" | "status" | "tera">
}

export type RestrictionChange = {
  before: DraftPoolRestrictionSnapshot
  after: DraftPoolRestrictionSnapshot
}

export type DraftPoolDiff = {
  entries: {
    added: DraftPoolEntrySnapshot[]
    removed: DraftPoolEntrySnapshot[]
    changed: EntryChange[]
  }
  restrictions: {
    added: DraftPoolRestrictionSnapshot[]
    removed: DraftPoolRestrictionSnapshot[]
    changed: RestrictionChange[]
  }
}

function entryKey(entry: DraftPoolEntrySnapshot) {
  return entry.pokemon_id === null
    ? `name:${entry.sheet_name.trim().toLocaleLowerCase()}`
    : `pokemon:${entry.pokemon_id}`
}

function restrictionKey(restriction: DraftPoolRestrictionSnapshot) {
  const subject = restriction.pokemon_id === null
    ? restriction.sheet_name?.trim().toLocaleLowerCase() ?? "global"
    : `pokemon:${restriction.pokemon_id}`
  return `${subject}|${restriction.kind}|${restriction.name.trim().toLocaleLowerCase()}`
}

function bySheetName<T extends { sheet_name: string | null }>(a: T, b: T) {
  return (a.sheet_name ?? "").localeCompare(b.sheet_name ?? "")
}

export function diffDraftPoolVersions(
  publishedEntries: DraftPoolEntrySnapshot[],
  pendingEntries: DraftPoolEntrySnapshot[],
  publishedRestrictions: DraftPoolRestrictionSnapshot[],
  pendingRestrictions: DraftPoolRestrictionSnapshot[],
): DraftPoolDiff {
  const publishedEntryMap = new Map(
    publishedEntries.map((entry) => [entryKey(entry), entry]),
  )
  const pendingEntryMap = new Map(
    pendingEntries.map((entry) => [entryKey(entry), entry]),
  )
  const added = pendingEntries
    .filter((entry) => !publishedEntryMap.has(entryKey(entry)))
    .sort(bySheetName)
  const removed = publishedEntries
    .filter((entry) => !pendingEntryMap.has(entryKey(entry)))
    .sort(bySheetName)
  const changed = pendingEntries.flatMap((after) => {
    const before = publishedEntryMap.get(entryKey(after))
    if (!before) return []
    const fields: EntryChange["changed"] = []
    if (before.points !== after.points) fields.push("points")
    if (before.status !== after.status) fields.push("status")
    if (before.tera_banned !== after.tera_banned) fields.push("tera")
    return fields.length > 0 ? [{ before, after, changed: fields }] : []
  }).sort((a, b) => bySheetName(a.after, b.after))

  const publishedRestrictionMap = new Map(
    publishedRestrictions.map((restriction) => [
      restrictionKey(restriction),
      restriction,
    ]),
  )
  const pendingRestrictionMap = new Map(
    pendingRestrictions.map((restriction) => [
      restrictionKey(restriction),
      restriction,
    ]),
  )
  const restrictionsAdded = pendingRestrictions
    .filter(
      (restriction) =>
        !publishedRestrictionMap.has(restrictionKey(restriction)),
    )
    .sort(bySheetName)
  const restrictionsRemoved = publishedRestrictions
    .filter(
      (restriction) => !pendingRestrictionMap.has(restrictionKey(restriction)),
    )
    .sort(bySheetName)
  const restrictionsChanged = pendingRestrictions.flatMap((after) => {
    const before = publishedRestrictionMap.get(restrictionKey(after))
    if (!before || before.note === after.note) return []
    return [{ before, after }]
  }).sort((a, b) => bySheetName(a.after, b.after))

  return {
    entries: { added, removed, changed },
    restrictions: {
      added: restrictionsAdded,
      removed: restrictionsRemoved,
      changed: restrictionsChanged,
    },
  }
}
