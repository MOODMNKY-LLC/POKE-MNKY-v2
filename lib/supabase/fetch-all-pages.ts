/**
 * Server helper for reading complete result sets through PostgREST, which silently
 * truncates a single response at its max-rows setting (1000 by default).
 */

export const SUPABASE_PAGE_SIZE = 1000

export type FetchPageResult<T> = {
  data: T[] | null
  error: { message: string } | null
}

/**
 * Calls `fetchPage(from, to)` (inclusive range, like `.range(from, to)`) until a page
 * returns fewer than `pageSize` rows. The query behind `fetchPage` MUST have a
 * deterministic order so pages never overlap or skip rows.
 */
export async function fetchAllPages<T>(
  fetchPage: (from: number, to: number) => PromiseLike<FetchPageResult<T>>,
  pageSize: number = SUPABASE_PAGE_SIZE,
): Promise<T[]> {
  const rows: T[] = []
  for (let from = 0; ; from += pageSize) {
    const { data, error } = await fetchPage(from, from + pageSize - 1)
    if (error) throw new Error(error.message)
    const page = data ?? []
    rows.push(...page)
    if (page.length < pageSize) return rows
  }
}
