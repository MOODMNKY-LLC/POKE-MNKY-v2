/**
 * Admin season listing helpers.
 *
 * Competitive admin pickers must exclude sandboxes.
 * Admin inventory UIs may include sandboxes when labeled (`includeSandbox: true`).
 */

export type AdminSeasonListRow = {
  id: string
  name: string
  is_current?: boolean | null
  is_sandbox?: boolean | null
  sheet_sync_enabled?: boolean | null
  [key: string]: unknown
}

export function filterAdminSeasonPickerRows<T extends AdminSeasonListRow>(
  rows: T[],
  options: { includeSandbox?: boolean } = {},
): T[] {
  if (options.includeSandbox) return rows
  return rows.filter((row) => row.is_sandbox !== true)
}

export function labelSandboxSeasonName(name: string, isSandbox?: boolean | null): string {
  if (isSandbox !== true) return name
  return `${name} [SANDBOX]`
}

export function preferredCompetitiveSeasonId(
  rows: AdminSeasonListRow[],
): string | null {
  const eligible = filterAdminSeasonPickerRows(rows)
  return (
    eligible.find((s) => s.sheet_sync_enabled)?.id ??
    eligible.find((s) => s.is_current)?.id ??
    eligible[0]?.id ??
    null
  )
}
