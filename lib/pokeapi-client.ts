/**
 * Type-safe PokéAPI client using OpenAPI spec
 * Provides validation, error handling, and retry logic
 */

import createClient from 'openapi-fetch'
import type { paths } from './types/pokeapi-generated'

const BASE_URL = 'https://pokeapi.co/api/v2'

// Create type-safe client
const client = createClient<paths>({
  baseUrl: BASE_URL,
})

export interface PokeAPIError {
  type: 'network' | 'validation' | 'api' | 'unknown'
  message: string
  status?: number
  url?: string
  details?: unknown
}

export interface FetchOptions {
  retries?: number
  retryDelay?: number
  timeout?: number
}

/**
 * Type-safe fetch with retry logic and error handling
 */
export async function fetchResource<T extends keyof paths>(
  endpoint: T,
  options: {
    params?: any
    fetchOptions?: FetchOptions
  } = {}
): Promise<{ data: any; error: null } | { data: null; error: PokeAPIError }> {
  const { params, fetchOptions = {} } = options
  const { retries = 3, retryDelay = 1000, timeout = 30000 } = fetchOptions

  let lastError: PokeAPIError | null = null

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      // Create abort controller for timeout
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), timeout)

      const result = await client.GET(endpoint as any, {
        ...params,
        signal: controller.signal,
      })

      clearTimeout(timeoutId)

      if (result.error) {
        // Handle typed errors from openapi-fetch
        const error: PokeAPIError = {
          type: result.response?.status === 404 ? 'api' : 'unknown',
          message: result.error.message || 'Unknown error',
          status: result.response?.status,
          url: result.response?.url,
          details: result.error,
        }

        // Retry on network errors or 5xx
        if (
          attempt < retries &&
          (error.type === 'network' ||
            (result.response?.status && result.response.status >= 500))
        ) {
          await new Promise((resolve) =>
            setTimeout(resolve, retryDelay * Math.pow(2, attempt))
          )
          lastError = error
          continue
        }

        return { data: null, error }
      }

      // Validate response structure (basic check)
      if (!result.data) {
        return {
          data: null,
          error: {
            type: 'validation',
            message: 'Empty response from PokéAPI',
            url: result.response?.url,
          },
        }
      }

      // Extract resource type from endpoint for validation
      const endpointStr = String(endpoint)
      const resourceTypeMatch = endpointStr.match(/\/api\/v2\/([^\/]+)/)
      const resourceType = resourceTypeMatch ? resourceTypeMatch[1] : null

      // Validate response against Zod schema if we have one
      if (resourceType && RESOURCE_SCHEMAS[resourceType]) {
        const validation = validatePokAPIResponse(resourceType, result.data)
        if (!validation.success) {
          return {
            data: null,
            error: {
              type: 'validation',
              message: `Response validation failed: ${validation.error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(', ')}`,
              url: result.response?.url,
              details: validation.error.errors,
            },
          }
        }
        return { data: validation.data, error: null }
      }

      return { data: result.data, error: null }
    } catch (err: any) {
      const error: PokeAPIError = {
        type: err.name === 'AbortError' ? 'network' : 'unknown',
        message: err.message || 'Unknown error',
        details: err,
      }

      // Retry on network errors
      if (attempt < retries && error.type === 'network') {
        await new Promise((resolve) =>
          setTimeout(resolve, retryDelay * Math.pow(2, attempt))
        )
        lastError = error
        continue
      }

      return { data: null, error }
    }
  }

  return { data: null, error: lastError || { type: 'unknown', message: 'Max retries exceeded' } }
}

/**
 * Fetch a list endpoint (paginated)
 */
export async function fetchResourceList(
  resourceType: string,
  options: {
    limit?: number
    offset?: number
    fetchOptions?: FetchOptions
  } = {}
): Promise<{ data: any; error: null } | { data: null; error: PokeAPIError }> {
  const { limit = 1000, offset = 0, fetchOptions } = options

  return fetchResource(`/api/v2/${resourceType}/` as any, {
    params: {
      query: { limit, offset },
    },
    fetchOptions,
  })
}

/**
 * Fetch a specific resource by ID or name
 */
export async function fetchResourceById(
  resourceType: string,
  id: string | number,
  options: FetchOptions = {}
): Promise<{ data: any; error: null } | { data: null; error: PokeAPIError }> {
  return fetchResource(`/api/v2/${resourceType}/{id}/` as any, {
    params: {
      path: { id: String(id) },
    },
    fetchOptions: options,
  })
}

/**
 * Fetch resource by URL (extracts type and id from URL)
 */
export async function fetchResourceByUrl(
  url: string,
  options: FetchOptions = {}
): Promise<{ data: any; error: null } | { data: null; error: PokeAPIError }> {
  try {
    // Parse URL: https://pokeapi.co/api/v2/pokemon/25/
    const urlObj = new URL(url)
    const parts = urlObj.pathname.split('/').filter(Boolean)
    // ['api', 'v2', 'pokemon', '25']
    const resourceType = parts[2]
    const id = parts[3]

    if (!resourceType || !id) {
      return {
        data: null,
        error: {
          type: 'validation',
          message: `Invalid PokéAPI URL: ${url}`,
          url,
        },
      }
    }

    return fetchResourceById(resourceType, id, options)
  } catch (err: any) {
    return {
      data: null,
      error: {
        type: 'validation',
        message: `Failed to parse URL: ${err.message}`,
        url,
        details: err,
      },
    }
  }
}

export default client
