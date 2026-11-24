import { NextResponse } from "next/server"
import { openai } from "@ai-sdk/openai"
import { streamText } from "ai"
import { createServerClient } from "@/lib/supabase/server"
import { knowledgeEnabled, knowledgeRole } from "@/lib/aab-knowledge/gate"
import { fallbackAnswer, retrieveForApp, citationPrefix } from "@/lib/aab-knowledge/retrieve"

const KINDS = {
  pending: ["aab_get_pending_decisions"],
  "points-call": ["aab_get_commissioner_meetings", "aab_get_pending_decisions"],
  recap: ["aab_get_announcements", "aab_get_season_history"],
  clarification: ["aab_get_league_rules", "aab_get_draft_rules"],
} as const

type DraftKind = keyof typeof KINDS

function isKind(value: string): value is DraftKind {
  return value in KINDS
}

export async function POST(request: Request) {
  if (!knowledgeEnabled()) return NextResponse.json({ error: "not_found" }, { status: 404 })
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 })
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle()
  if (knowledgeRole(profile?.role) !== "maus") {
    return NextResponse.json({ error: "permission_denied" }, { status: 403 })
  }
  let body: { kind?: unknown; question?: unknown }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 })
  }
  if (typeof body.kind !== "string" || !isKind(body.kind)) {
    return NextResponse.json({ error: "invalid_kind" }, { status: 400 })
  }
  const question = typeof body.question === "string" ? body.question.slice(0, 1000) : ""
  const packets = []
  for (const tool of KINDS[body.kind]) {
    packets.push(await retrieveForApp("maus", tool))
  }
  const header = {
    draft: true,
    published: false,
    kind: body.kind,
    note: "Reviewable draft. Nothing was written to Notion, Discord, or the league database.",
  }
  if (!process.env.OPENAI_API_KEY) {
    return NextResponse.json({
      ...header,
      inference: "unavailable",
      answer: packets.map((packet) => fallbackAnswer(body.kind, packet as Record<string, unknown>)).join("\n\n"),
      packets,
    })
  }
  const result = await streamText({
    model: openai(process.env.AAB_KNOWLEDGE_MODEL || "gpt-4o"),
    abortSignal: AbortSignal.timeout(25000),
    system: [
      "Write a reviewable commissioner draft for Average At Best.",
      "Do not publish, post, or change a rule.",
      "Use only the retrieved JSON. If text is missing, say so and leave a blank for the commissioner.",
      "Label confirmed rules, historical information, pending decisions, and recommendations separately.",
    ].join(" "),
    prompt: JSON.stringify({ question, packets, ...header }),
  })
  const prefix = packets.map((packet) => citationPrefix(packet as Record<string, unknown>)).join("")
  const encoder = new TextEncoder()
  const bodyStream = new ReadableStream({
    async start(controller) {
      controller.enqueue(encoder.encode(prefix))
      for await (const chunk of result.textStream) controller.enqueue(encoder.encode(chunk))
      controller.close()
    },
  })
  return new Response(bodyStream, {
    headers: {
      "content-type": "text/plain; charset=utf-8",
      "x-aab-draft": "review-only",
    },
  })
}
