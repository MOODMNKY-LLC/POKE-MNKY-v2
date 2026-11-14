import { describe, expect, it, vi } from "vitest"
import { fetchAllPages, type FetchPageResult } from "./fetch-all-pages"

function fakeTable(total: number, maxRows = 1000) {
  const all = Array.from({ length: total }, (_, i) => i)
  return vi.fn(
    async (from: number, to: number): Promise<FetchPageResult<number>> => ({
      data: all.slice(from, Math.min(to + 1, from + maxRows)),
      error: null,
    }),
  )
}

describe("fetchAllPages", () => {
  it("returns an empty list after one call for 0 rows", async () => {
    const fetchPage = fakeTable(0)
    expect(await fetchAllPages(fetchPage)).toEqual([])
    expect(fetchPage).toHaveBeenCalledTimes(1)
    expect(fetchPage).toHaveBeenCalledWith(0, 999)
  })

  it("requests a second (empty) page when exactly one full page exists", async () => {
    const fetchPage = fakeTable(1000)
    const rows = await fetchAllPages(fetchPage)
    expect(rows).toHaveLength(1000)
    expect(fetchPage).toHaveBeenCalledTimes(2)
    expect(fetchPage).toHaveBeenLastCalledWith(1000, 1999)
  })

  it("combines 1135 rows across two pages in order without gaps or duplicates", async () => {
    const fetchPage = fakeTable(1135)
    const rows = await fetchAllPages(fetchPage)
    expect(rows).toHaveLength(1135)
    expect(rows).toEqual(Array.from({ length: 1135 }, (_, i) => i))
    expect(fetchPage).toHaveBeenCalledTimes(2)
    expect(fetchPage).toHaveBeenNthCalledWith(1, 0, 999)
    expect(fetchPage).toHaveBeenNthCalledWith(2, 1000, 1999)
  })

  it("treats null data as an empty page", async () => {
    const fetchPage = vi.fn(async () => ({ data: null, error: null }))
    expect(await fetchAllPages(fetchPage)).toEqual([])
  })

  it("propagates an error from any page", async () => {
    const fetchPage = vi
      .fn<(from: number, to: number) => Promise<FetchPageResult<number>>>()
      .mockResolvedValueOnce({ data: Array.from({ length: 1000 }, (_, i) => i), error: null })
      .mockResolvedValueOnce({ data: null, error: { message: "boom" } })
    await expect(fetchAllPages(fetchPage)).rejects.toThrow("boom")
    expect(fetchPage).toHaveBeenCalledTimes(2)
  })

  it("honors a custom page size", async () => {
    const fetchPage = fakeTable(25)
    expect(await fetchAllPages(fetchPage, 10)).toHaveLength(25)
    expect(fetchPage).toHaveBeenCalledTimes(3)
    expect(fetchPage).toHaveBeenNthCalledWith(3, 20, 29)
  })
})
