/** Extract the latest user text from Vercel AI SDK UI messages. */
export function extractLatestUserText(messages: unknown): string {
  if (!Array.isArray(messages) || messages.length === 0) {
    return ""
  }

  for (let i = messages.length - 1; i >= 0; i--) {
    const msg = messages[i] as Record<string, unknown>
    if (msg.role !== "user") continue

    const parts = msg.parts
    if (Array.isArray(parts)) {
      const text = parts
        .filter((p) => (p as { type?: string }).type === "text")
        .map((p) => String((p as { text?: string }).text ?? ""))
        .join("")
      if (text.trim()) return text.trim()
    }

    const content = msg.content
    if (typeof content === "string" && content.trim()) {
      return content.trim()
    }
    if (Array.isArray(content)) {
      const text = content
        .filter((c) => (c as { type?: string }).type === "text")
        .map((c) => String((c as { text?: string }).text ?? ""))
        .join("")
      if (text.trim()) return text.trim()
    }
  }

  return ""
}
