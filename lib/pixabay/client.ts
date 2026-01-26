/**
 * Pixabay API Client
 * 
 * Client for searching and downloading music tracks from Pixabay.
 * Pixabay provides royalty-free music that can be used commercially.
 */

export interface PixabayMusicTrack {
  id: number
  pageURL: string
  type: string
  tags: string
  duration: number
  picture_id?: string
  formats: {
    [key: string]: {
      url: string
      duration: number
      format: string
      size: number
    }
  }
  title?: string // May not always be present in search results
  user_id: number
  user: string
  userImageURL?: string
  // Additional fields that may be present (similar to videos API)
  views?: number
  downloads?: number
  likes?: number
  comments?: number
  // Additional fields that may be present in API response
  [key: string]: any
}

export interface PixabaySearchResponse {
  total: number
  totalHits: number
  hits: PixabayMusicTrack[]
}

export class PixabayClient {
  private apiKey: string
  private baseUrl = 'https://pixabay.com/api'

  constructor(apiKey?: string) {
    this.apiKey = apiKey || process.env.PIXABAY_API_KEY || ''
    if (!this.apiKey) {
      console.warn('[PixabayClient] No API key provided. Set PIXABAY_API_KEY environment variable.')
    }
  }

  /**
   * Search for music tracks
   */
  /**
   * Search for music tracks
   * 
   * IMPORTANT: Pixabay's official API does NOT support music search.
   * This method will attempt to search but may return images instead.
   * Music tracks must be accessed via web scraping or manual curation.
   */
  async searchMusic(
    query: string,
    options?: {
      category?: string
      min_duration?: number
      max_duration?: number
      per_page?: number
      page?: number
    }
  ): Promise<PixabaySearchResponse> {
    if (!this.apiKey) {
      throw new Error('Pixabay API key is required')
    }

    // NOTE: Pixabay API doesn't support music - audio_type parameter is ignored
    // We're using the images API endpoint which will return images, not music
    const params = new URLSearchParams({
      key: this.apiKey,
      q: query,
      // audio_type: 'music', // This parameter doesn't exist/work in Pixabay API
      per_page: String(options?.per_page || 20),
      page: String(options?.page || 1),
    })

    if (options?.category) {
      params.append('category', options.category)
    }
    if (options?.min_duration) {
      params.append('min_duration', String(options.min_duration))
    }
    if (options?.max_duration) {
      params.append('max_duration', String(options.max_duration))
    }

    const response = await fetch(`${this.baseUrl}/?${params.toString()}`)

    if (!response.ok) {
      throw new Error(`Pixabay API error: ${response.statusText}`)
    }

    const data: PixabaySearchResponse = await response.json()
    
    // Filter out non-music results (images, vectors, illustrations)
    // Music tracks should have pageURL containing '/music/' or type containing 'music'
    const musicTracks = data.hits.filter(hit => {
      const pageURL = hit.pageURL?.toLowerCase() || ''
      const type = hit.type?.toLowerCase() || ''
      // Check if it's a music track (has /music/ in URL or type is music-related)
      return pageURL.includes('/music/') || type.includes('music') || type.includes('audio')
    })

    // If no music tracks found, return empty results with a warning
    if (musicTracks.length === 0 && data.hits.length > 0) {
      console.warn(
        '[PixabayClient] No music tracks found. Pixabay API does not support music search. ' +
        'All results were filtered out as non-music content (images/vectors/illustrations).'
      )
    }

    return {
      ...data,
      hits: musicTracks,
      totalHits: musicTracks.length,
    }
  }

  /**
   * Get track details by ID
   * Based on Pixabay API docs, use `id` parameter to retrieve individual tracks
   */
  async getTrackById(trackId: number): Promise<PixabayMusicTrack | null> {
    if (!this.apiKey) {
      throw new Error('Pixabay API key is required')
    }

    const params = new URLSearchParams({
      key: this.apiKey,
      id: String(trackId),
      audio_type: 'music',
    })

    const apiUrl = `${this.baseUrl}/?${params.toString()}`
    console.log('[PixabayClient] Fetching track by ID from:', apiUrl)
    
    const response = await fetch(apiUrl)

    if (!response.ok) {
      // Handle rate limiting
      if (response.status === 429) {
        const resetTime = response.headers.get('X-RateLimit-Reset')
        throw new Error(
          `Pixabay API rate limit exceeded. Limit resets in ${resetTime || 'unknown'} seconds.`
        )
      }
      
      const errorText = await response.text().catch(() => response.statusText)
      console.error('[PixabayClient] API error response:', response.status, errorText)
      throw new Error(`Pixabay API error (${response.status}): ${errorText}`)
    }

    const data: PixabaySearchResponse = await response.json()
    console.log('[PixabayClient] Raw API response for track:', JSON.stringify(data, null, 2))
    
    const track = data.hits[0] || null
    if (track) {
      console.log('[PixabayClient] Track found, formats:', track.formats ? Object.keys(track.formats) : 'none')
    }
    
    return track
  }

  /**
   * Download track file from URL
   * Note: Pixabay tracks are typically available via their CDN
   */
  async downloadTrack(trackUrl: string): Promise<Buffer> {
    const response = await fetch(trackUrl)

    if (!response.ok) {
      throw new Error(`Failed to download track: ${response.statusText}`)
    }

    const arrayBuffer = await response.arrayBuffer()
    return Buffer.from(arrayBuffer)
  }

  /**
   * Get best quality format URL from track
   * Based on Pixabay API docs, formats are similar to videos API structure
   * Also checks for alternative field names that might contain audio URLs
   */
  getBestFormatUrl(track: PixabayMusicTrack): string | null {
    const formats = track.formats || {}
    
    // Priority: mp3 (best compatibility) > ogg > other formats
    if (formats['mp3']?.url) return formats['mp3'].url
    if (formats['ogg']?.url) return formats['ogg'].url
    
    // Fallback to first available format
    const formatKeys = Object.keys(formats)
    if (formatKeys.length > 0) {
      const firstFormat = formats[formatKeys[0]]
      if (firstFormat?.url) return firstFormat.url
    }

    // Check for alternative field names (in case API structure differs)
    const trackAny = track as any
    if (trackAny.audio?.url) return trackAny.audio.url
    if (trackAny.previewURL) return trackAny.previewURL
    if (trackAny.preview_url) return trackAny.preview_url
    if (trackAny.audioURL) return trackAny.audioURL
    if (trackAny.audio_url) return trackAny.audio_url
    if (trackAny.downloadUrl) return trackAny.downloadUrl
    if (trackAny.download_url) return trackAny.download_url
    
    // Check if there's a direct URL field
    if (typeof trackAny.url === 'string' && trackAny.url.startsWith('http')) {
      return trackAny.url
    }

    return null
  }

  /**
   * Extract track title from pageURL slug
   * Pixabay music URLs format: https://pixabay.com/music/lofi-starting-steps-lofi-guitar-462746/
   * Converts slug to readable title: "lofi-starting-steps-lofi-guitar" -> "Starting Steps Lofi (guitar)"
   */
  extractTitleFromPageURL(pageURL: string): string | null {
    try {
      console.log('[extractTitleFromPageURL] Processing URL:', pageURL)
      
      // Try multiple URL patterns
      // Pattern 1: /music/lofi-starting-steps-lofi-guitar-462746/
      let urlMatch = pageURL.match(/\/music\/([^\/]+)\//)
      
      // Pattern 2: /music/lofi-starting-steps-lofi-guitar-462746 (no trailing slash)
      if (!urlMatch) {
        urlMatch = pageURL.match(/\/music\/([^\/]+)$/)
      }
      
      // Pattern 3: Just the slug part after /music/
      if (!urlMatch) {
        const parts = pageURL.split('/music/')
        if (parts.length > 1) {
          const slugPart = parts[1].split('/')[0].split('?')[0]
          urlMatch = [null, slugPart]
        }
      }
      
      if (!urlMatch || !urlMatch[1]) {
        console.log('[extractTitleFromPageURL] No match found for URL:', pageURL)
        return null
      }

      const slug = urlMatch[1]
      console.log('[extractTitleFromPageURL] Extracted slug:', slug)
      
      // Remove the ID at the end (e.g., "-462746")
      const slugWithoutId = slug.replace(/-\d+$/, '')
      console.log('[extractTitleFromPageURL] Slug without ID:', slugWithoutId)
      
      // Convert slug to readable format
      // "lofi-starting-steps-lofi-guitar" -> "Starting Steps Lofi (guitar)"
      const words = slugWithoutId.split('-')
      
      // Handle common patterns like "lofi" prefix and instrument suffixes
      let titleWords: string[] = []
      let hasLofi = false
      let instrument: string | null = null
      
      for (let i = 0; i < words.length; i++) {
        const word = words[i]
        
        // Skip "lofi" if it's at the start (common pattern)
        if (i === 0 && word.toLowerCase() === 'lofi') {
          hasLofi = true
          continue
        }
        
        // Check for instrument keywords (guitar, piano, etc.)
        const instrumentKeywords = ['guitar', 'piano', 'violin', 'drums', 'bass', 'sax', 'flute', 'trumpet']
        if (instrumentKeywords.includes(word.toLowerCase())) {
          instrument = word.charAt(0).toUpperCase() + word.slice(1)
          continue
        }
        
        // Capitalize and add word
        titleWords.push(word.charAt(0).toUpperCase() + word.slice(1))
      }
      
      // Build title
      let title = titleWords.join(' ')
      
      // Add "Lofi" prefix if it was present
      if (hasLofi && !title.toLowerCase().includes('lofi')) {
        title = `Lofi ${title}`
      }
      
      // Add instrument in parentheses if found
      if (instrument) {
        title = `${title} (${instrument})`
      }
      
      return title || null
    } catch (error) {
      console.error('[PixabayClient] Error extracting title from URL:', error)
      return null
    }
  }

  /**
   * Get track title, preferring API title, falling back to extracted title from URL
   */
  getTrackTitle(track: PixabayMusicTrack): string {
    // Debug logging
    console.log('[getTrackTitle] Track:', {
      id: track.id,
      title: track.title,
      pageURL: track.pageURL,
      hasTitle: !!track.title,
      titleLength: track.title?.length || 0
    })
    
    // Use API title if available
    if (track.title && track.title.trim().length > 0) {
      console.log('[getTrackTitle] Using API title:', track.title)
      return track.title
    }
    
    // Extract from pageURL as fallback
    console.log('[getTrackTitle] Attempting URL extraction from:', track.pageURL)
    const extractedTitle = this.extractTitleFromPageURL(track.pageURL)
    if (extractedTitle) {
      console.log('[getTrackTitle] Extracted title:', extractedTitle)
      return extractedTitle
    }
    
    console.warn('[getTrackTitle] Failed to extract title, trying fallbacks')
    
    // Fallback 1: Try a simpler URL extraction
    if (track.pageURL) {
      // Try to get any meaningful text from the URL
      const urlParts = track.pageURL.split('/')
      const lastPart = urlParts[urlParts.length - 1] || urlParts[urlParts.length - 2]
      if (lastPart && lastPart !== 'music' && lastPart.length > 0) {
        // Remove ID and convert to title case
        const withoutId = lastPart.replace(/-\d+$/, '').replace(/\.html$/, '').split('?')[0]
        if (withoutId.length > 0 && withoutId !== 'music') {
          const simpleTitle = withoutId
            .split('-')
            .filter(w => w.length > 0 && !/^\d+$/.test(w)) // Filter out pure numbers
            .map(w => w.charAt(0).toUpperCase() + w.slice(1))
            .join(' ')
          if (simpleTitle.length > 0) {
            console.log('[getTrackTitle] Simple extraction:', simpleTitle)
            return simpleTitle
          }
        }
      }
    }
    
    // Fallback 2: Use first tag as title
    if (track.tags && track.tags.trim().length > 0) {
      const firstTag = track.tags.split(',')[0].trim()
      if (firstTag.length > 0) {
        const tagTitle = firstTag
          .split(/[\s-]+/)
          .map(w => w.charAt(0).toUpperCase() + w.slice(1))
          .join(' ')
        console.log('[getTrackTitle] Using tag as title:', tagTitle)
        return tagTitle
      }
    }
    
    console.error('[getTrackTitle] All extraction methods failed for track:', track.id)
    return 'Untitled Track'
  }
}
