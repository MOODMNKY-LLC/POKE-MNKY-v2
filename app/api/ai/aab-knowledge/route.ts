import { NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase/server"
import {
  allowedToolNames,
  authorizeKnowledgeTool,
  knowledgeEnabled,
  knowledgeRole,
} from "@/lib/aab-knowledge/gate"

const hits = new Map<string, number[]>()

function limited(userId: string): boolean {
  const now = Date.now()
  const recent = (hits.get(userId) || []).filter((at) => now - at < 60_000)
  if (recent.length >= 20) {
    hits.set(userId, recent)
    return true
  }
  recent.push(now)
  hits.set(userId, recent)
  return false
}

async function caller() {
  if (!knowledgeEnabled()) return { response: NextResponse.json({ error: "not_found" }, { status: 404 }) }
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { response: NextResponse.json({ error: "unauthorized" }, { status: 401 }) }
  if (limited(user.id)) return { response: NextResponse.json({ error: "rate_limited" }, { status: 429 }) }
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle()
  const role = knowledgeRole(profile?.role)
  return { userId: user.id, role }
}

export async function GET() {
  const session = await caller()
  if ("response" in session && session.response) return session.response
  return NextResponse.json({
    role: session.role,
    tools: allowedToolNames(session.role),
  })
}

export async function POST(request: Request) {
  const session = await caller()
  if ("response" in session && session.response) return session.response
  let body: { tool?: unknown; arguments?: unknown }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 })
  }
  if (typeof body.tool !== "string" || body.tool.includes("page")) {
    return NextResponse.json({ error: "invalid_tool" }, { status: 400 })
  }
  const args = body.arguments && typeof body.arguments === "object" ? body.arguments as Record<string, unknown> : {}
  const result = authorizeKnowledgeTool(session.role, body.tool, args)
  if ("error" in result && result.error === "permission_denied") {
    return NextResponse.json({ error: "permission_denied" }, { status: 403 })
  }
  return NextResponse.json(result)
}
