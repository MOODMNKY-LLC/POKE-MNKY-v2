/**
 * Optional: fetch coach onboarding guide content from Notion.
 * Set COACH_ONBOARDING_NOTION_PAGE_ID and NOTION_API_KEY to use.
 * Returns null when Notion is not configured or fetch fails.
 *
 * Env (see docs/COACH-ONBOARDING-NOTION.md):
 * - NOTION_API_KEY: Notion integration token
 * - COACH_ONBOARDING_NOTION_PAGE_ID: Notion page ID or full notion.so URL (e.g. League Wiki)
 */

import { NextResponse } from "next/server"
import { createNotionClient, getPage } from "@/lib/notion/client"

/** Extract Notion page ID from env: allow raw ID (with/without dashes) or notion.so URL. */
function parsePageId(value: string): string | null {
  const trimmed = value.trim()
  if (!trimmed) return null
  const urlMatch = trimmed.match(/notion\.(?:so|site)\/[^\s/]*-([0-9a-f]{32})/i)
  if (urlMatch) return urlMatch[1]
  const idMatch = trimmed.replace(/-/g, "").match(/^([0-9a-f]{32})$/i)
  return idMatch ? idMatch[1] : null
}

export async function GET() {
  const raw = process.env.COACH_ONBOARDING_NOTION_PAGE_ID?.trim()
  const pageId = raw ? parsePageId(raw) : null
  if (!pageId || !process.env.NOTION_API_KEY) {
    return NextResponse.json({ content: null, notion_page_url: null })
  }

  try {
    const client = createNotionClient()
    const page = await getPage(client, pageId)
    const url = (page as { url?: string }).url ?? `https://www.notion.so/${pageId}`
    const title =
      (page.properties?.title as { title?: Array<{ plain_text?: string }> } | undefined)?.title?.[0]
        ?.plain_text ?? "Coach onboarding"
    return NextResponse.json({
      content: null,
      notion_page_url: url,
      title,
    })
  } catch {
    return NextResponse.json({ content: null, notion_page_url: null })
  }
}
