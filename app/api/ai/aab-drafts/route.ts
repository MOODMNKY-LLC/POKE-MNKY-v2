import { NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase/server"
import { knowledgeEnabled, knowledgeRole } from "@/lib/aab-knowledge/gate"
import { retrieveForApp } from "@/lib/aab-knowledge/retrieve"
import { collectSources } from "@/lib/aab-knowledge/excerpts"
import { buildDraftTemplate, DRAFT_KINDS, type DraftKind } from "@/lib/aab-knowledge/template"

function isKind(value: string): value is DraftKind {
  return value in DRAFT_KINDS
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
  const kind = body.kind
  const focus = typeof body.question === "string" ? body.question.slice(0, 1000).trim() : ""
  const tools = DRAFT_KINDS[kind]
  const packets: Array<Record<string, unknown>> = []
  for (const tool of tools) {
    packets.push((await retrieveForApp("maus", tool)) as Record<string, unknown>)
  }
  return NextResponse.json({
    draft: true,
    published: false,
    kind,
    mode: "template",
    inference: "disabled",
    note: "Reviewable draft. Nothing was written to Notion, Discord, or the league database.",
    draft_text: buildDraftTemplate(kind, tools, packets, focus),
    sources: packets.flatMap((packet) => collectSources(packet)),
    packets,
  })
}
