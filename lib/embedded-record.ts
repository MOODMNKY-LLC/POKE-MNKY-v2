/**
 * Supabase embeds a many-to-one relation as an object and a one-to-many
 * relation as an array. Callers that only unwrap arrays drop the object
 * and render blank names.
 */
export function firstEmbedded(value: unknown): Record<string, unknown> | null {
  const row = Array.isArray(value) ? value[0] : value
  if (!row || typeof row !== "object") return null
  return row as Record<string, unknown>
}

export function embeddedString(row: Record<string, unknown> | null, key: string): string | null {
  const value = row?.[key]
  return typeof value === "string" && value.trim() !== "" ? value : null
}
