/**
 * Safe accessors for google-spreadsheet worksheets (headers may throw if not loaded).
 */

export function safeSheetHeaderValues(sheet: { headerValues?: string[] }): string[] {
  try {
    const values = sheet.headerValues
    return Array.isArray(values) ? values : []
  } catch {
    return []
  }
}

/** Errors that should not fail a sync when the Data tab (or other core data) succeeded. */
export function isBenignSheetSyncMessage(message: string): boolean {
  const m = message.toLowerCase()
  return (
    m.includes("no rows found in sheet") ||
    m.includes("header values are not yet loaded") ||
    m.includes("not found in spreadsheet") ||
    m.includes("should sync to teams") ||
    m.includes("not team standings") ||
    m.includes("per-team roster pages") ||
    m.includes("broken formulas") ||
    m.includes("map to team_rosters") ||
    m.includes("disable sync for")
  )
}
