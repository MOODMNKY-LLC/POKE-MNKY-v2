/**
 * Notion API Client
 * 
 * Provides type-safe interface for Notion API operations
 * Used for Phase 3.2 (data import) and Phase 4 (sync worker)
 */

import axios, { AxiosInstance, AxiosError } from "axios"

const NOTION_API_VERSION = "2022-06-28"
const NOTION_API_BASE = "https://api.notion.com/v1"

export interface NotionPage {
  id: string
  created_time: string
  last_edited_time: string
  properties: Record<string, any>
}

export interface NotionDatabase {
  id: string
  title: Array<{ plain_text: string }>
  properties: Record<string, any>
}

export interface NotionQueryResult {
  results: NotionPage[]
  has_more: boolean
  next_cursor: string | null
}

export interface NotionCreatePageRequest {
  parent: { database_id: string } | { page_id: string }
  properties: Record<string, any>
  children?: any[]
}

export interface NotionUpdatePageRequest {
  properties: Record<string, any>
}

export class NotionAPIError extends Error {
  constructor(
    message: string,
    public status?: number,
    public code?: string,
    public details?: any
  ) {
    super(message)
    this.name = "NotionAPIError"
  }
}

/**
 * Create Notion API client instance
 */
export function createNotionClient(apiKey?: string): AxiosInstance {
  const key = apiKey || process.env.NOTION_API_KEY

  if (!key) {
    throw new Error(
      "NOTION_API_KEY is required. Set it in environment variables or pass as parameter."
    )
  }

  const client = axios.create({
    baseURL: NOTION_API_BASE,
    headers: {
      "Authorization": `Bearer ${key}`,
      "Notion-Version": NOTION_API_VERSION,
      "Content-Type": "application/json",
    },
    timeout: 30000, // 30 seconds
  })

  // Add retry logic for rate limits
  client.interceptors.response.use(
    (response) => response,
    async (error: AxiosError) => {
      const config = error.config as any

      // Retry on rate limit (429) or server errors (5xx)
      if (
        error.response?.status === 429 ||
        (error.response?.status && error.response.status >= 500)
      ) {
        const retryCount = config.__retryCount || 0
        const maxRetries = 3

        if (retryCount < maxRetries) {
          config.__retryCount = retryCount + 1

          // Exponential backoff: 1s, 2s, 4s
          const delay = Math.pow(2, retryCount) * 1000

          // Check for Retry-After header
          const retryAfter = error.response.headers["retry-after"]
          const waitTime = retryAfter
            ? parseInt(retryAfter) * 1000
            : delay

          await new Promise((resolve) => setTimeout(resolve, waitTime))

          return client(config)
        }
      }

      // Transform error to NotionAPIError
      if (error.response) {
        const notionError = new NotionAPIError(
          error.response.data?.message || error.message,
          error.response.status,
          error.response.data?.code,
          error.response.data
        )
        throw notionError
      }

      throw error
    }
  )

  return client
}

/**
 * Query a Notion database with pagination support
 */
export async function queryDatabase(
  client: AxiosInstance,
  databaseId: string,
  options: {
    filter?: any
    sorts?: any[]
    start_cursor?: string
    page_size?: number
  } = {}
): Promise<NotionQueryResult> {
  const { filter, sorts, start_cursor, page_size = 100 } = options

  const response = await client.post<NotionQueryResult>(
    `/databases/${databaseId}/query`,
    {
      filter,
      sorts,
      start_cursor,
      page_size: Math.min(page_size, 100), // Notion max is 100
    }
  )

  return response.data
}

/**
 * Query all pages from a database (handles pagination automatically)
 */
export async function queryAllPages(
  client: AxiosInstance,
  databaseId: string,
  options: {
    filter?: any
    sorts?: any[]
    maxPages?: number
  } = {}
): Promise<NotionPage[]> {
  const { filter, sorts, maxPages } = options
  const allPages: NotionPage[] = []
  let cursor: string | null = null
  let pageCount = 0

  while (true) {
    if (maxPages && pageCount >= maxPages) break

    const result = await queryDatabase(client, databaseId, {
      filter,
      sorts,
      start_cursor: cursor || undefined,
    })

    allPages.push(...result.results)

    if (!result.has_more || !result.next_cursor) {
      break
    }

    cursor = result.next_cursor
    pageCount++
  }

  return allPages
}

/**
 * Create a page in a Notion database
 */
export async function createPage(
  client: AxiosInstance,
  request: NotionCreatePageRequest
): Promise<NotionPage> {
  const response = await client.post<NotionPage>("/pages", request)
  return response.data
}

/**
 * Create multiple pages (batch - Notion API doesn't support true batching, so we do sequential)
 */
export async function createPages(
  client: AxiosInstance,
  requests: NotionCreatePageRequest[],
  options: {
    batchSize?: number
    delayBetweenBatches?: number
  } = {}
): Promise<NotionPage[]> {
  const { batchSize = 10, delayBetweenBatches = 100 } = options
  const createdPages: NotionPage[] = []

  for (let i = 0; i < requests.length; i += batchSize) {
    const batch = requests.slice(i, i + batchSize)

    // Create pages in batch sequentially (Notion doesn't support parallel batch)
    const batchResults = await Promise.all(
      batch.map((req) => createPage(client, req))
    )

    createdPages.push(...batchResults)

    // Delay between batches to avoid rate limits
    if (i + batchSize < requests.length) {
      await new Promise((resolve) =>
        setTimeout(resolve, delayBetweenBatches)
      )
    }
  }

  return createdPages
}

/**
 * Update a Notion page
 */
export async function updatePage(
  client: AxiosInstance,
  pageId: string,
  request: NotionUpdatePageRequest
): Promise<NotionPage> {
  const response = await client.patch<NotionPage>(`/pages/${pageId}`, request)
  return response.data
}

/**
 * Get a Notion page by ID
 */
export async function getPage(
  client: AxiosInstance,
  pageId: string
): Promise<NotionPage> {
  const response = await client.get<NotionPage>(`/pages/${pageId}`)
  return response.data
}

/**
 * Get a Notion database by ID
 */
export async function getDatabase(
  client: AxiosInstance,
  databaseId: string
): Promise<NotionDatabase> {
  const response = await client.get<NotionDatabase>(
    `/databases/${databaseId}`
  )
  return response.data
}

/**
 * Extract property value from Notion page property
 */
export function extractPropertyValue(
  property: any,
  propertyType: string
): any {
  if (!property || !property[propertyType]) {
    return null
  }

  switch (propertyType) {
    case "title":
      return property.title
        .map((t: any) => t.plain_text)
        .join("")
        .trim() || null

    case "rich_text":
      return property.rich_text
        .map((t: any) => t.plain_text)
        .join("")
        .trim() || null

    case "number":
      return property.number

    case "select":
      return property.select?.name || null

    case "multi_select":
      return property.multi_select?.map((s: any) => s.name) || []

    case "checkbox":
      return property.checkbox || false

    case "date":
      return property.date?.start || null

    case "url":
      return property.url || null

    case "relation":
      return property.relation?.map((r: any) => r.id) || []

    case "rollup":
      // Rollup values depend on function - return raw for now
      return property.rollup

    case "formula":
      // Formula values depend on expression - return raw for now
      return property.formula

    default:
      return null
  }
}

/**
 * Build Notion property object for creation/update
 */
export function buildNotionProperty(
  propertyType: string,
  value: any
): any {
  if (value === null || value === undefined) {
    return null
  }

  switch (propertyType) {
    case "title":
      return {
        title: [{ text: { content: String(value) } }],
      }

    case "rich_text":
      return {
        rich_text: [{ text: { content: String(value) } }],
      }

    case "number":
      return {
        number: typeof value === "number" ? value : null,
      }

    case "select":
      return {
        select: value ? { name: String(value) } : null,
      }

    case "multi_select":
      return {
        multi_select: Array.isArray(value)
          ? value.map((v) => ({ name: String(v) }))
          : [],
      }

    case "checkbox":
      return {
        checkbox: Boolean(value),
      }

    case "date":
      return {
        date: value ? { start: new Date(value).toISOString() } : null,
      }

    case "url":
      return {
        url: value ? String(value) : null,
      }

    case "relation":
      // Notion relation property expects array of objects with id field
      if (!value) {
        return { relation: [] }
      }
      const relationArray = Array.isArray(value) ? value : [value]
      return {
        relation: relationArray.map((id) => ({ id: String(id) })),
      }

    default:
      return null
  }
}
