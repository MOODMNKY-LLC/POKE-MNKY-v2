export type SourceLink = { title: string; source_url: string; classification: string | null }

export type Excerpt = { text: string; source_title: string | null; source_url: string | null }

type Packet = Record<string, unknown>

const STOPWORDS = new Set([
  "the", "and", "for", "are", "but", "not", "you", "your", "was", "were", "this", "that", "these", "those",
  "with", "from", "what", "when", "where", "which", "who", "whom", "why", "how", "can", "could", "should",
  "would", "will", "shall", "may", "might", "must", "does", "did", "has", "have", "had", "its", "our",
  "about", "into", "than", "then", "them", "they", "there", "their", "any", "all", "out", "off", "too",
  "explain", "tell", "give", "show", "summarize", "summary", "please", "league",
])

export const MAX_EXCERPTS = 5
export const MAX_EXCERPT_CHARS = 600

export function questionKeywords(question: string): string[] {
  const words = question.toLowerCase().split(/[^\p{L}\p{N}]+/u)
  return [...new Set(words.filter((word) => word.length >= 3 && !STOPWORDS.has(word)))]
}

export function collectSources(packet: Packet | null | undefined): SourceLink[] {
  if (!packet || typeof packet !== "object") return []
  const packetClass = typeof packet.classification === "string" ? packet.classification : null
  const links: SourceLink[] = []
  const seen = new Set<string>()
  const add = (title: unknown, url: unknown, classification: unknown) => {
    if (typeof url !== "string" || !url || seen.has(url)) return
    seen.add(url)
    links.push({
      title: typeof title === "string" && title ? title : "Source",
      source_url: url,
      classification: typeof classification === "string" ? classification : packetClass,
    })
  }
  add(packet.title, packet.source_url, packet.classification)
  if (Array.isArray(packet.sources)) {
    for (const source of packet.sources) {
      if (source && typeof source === "object") {
        const row = source as Record<string, unknown>
        add(row.title, row.source_url, row.classification)
      }
    }
  }
  return links
}

function splitBlocks(content: string): string[] {
  const paragraphs = content.split(/\n\s*\n/).map((part) => part.trim()).filter(Boolean)
  if (paragraphs.length > 1) return paragraphs
  return content.split(/\n/).map((part) => part.trim()).filter(Boolean)
}

function clip(text: string): string {
  return text.length <= MAX_EXCERPT_CHARS ? text : `${text.slice(0, MAX_EXCERPT_CHARS - 1).trimEnd()}…`
}

export function extractExcerpts(question: string, packet: Packet | null | undefined): Excerpt[] {
  if (!packet || typeof packet.content !== "string" || !packet.content.trim()) return []
  const [primary] = collectSources(packet)
  const tag = { source_title: primary?.title ?? null, source_url: primary?.source_url ?? null }
  const blocks = splitBlocks(packet.content)
  const keywords = questionKeywords(question)
  const matches = keywords.length
    ? blocks.filter((block) => {
        const lower = block.toLowerCase()
        return keywords.some((word) => lower.includes(word))
      })
    : []
  const chosen = matches.length ? matches.slice(0, MAX_EXCERPTS) : blocks.slice(0, 2)
  return chosen.map((text) => ({ text: clip(text), ...tag }))
}
