import { NextRequest, NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase/server"
import { createServiceRoleClient } from "@/lib/supabase/service"
import { hasAnyRole, UserRole } from "@/lib/rbac"
import { z } from "zod"

const createMappingSchema = z.object({
  discord_role_id: z.string().min(1),
  discord_role_name: z.string().min(1),
  app_role: z.enum(["admin", "commissioner", "coach", "spectator"]),
  priority: z.number().int().optional(),
})

async function requireAdmin(supabase: Awaited<ReturnType<typeof createServerClient>>) {
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) }

  const allowed = await hasAnyRole(supabase, user.id, [
    UserRole.ADMIN,
    UserRole.COMMISSIONER,
  ])
  if (!allowed) {
    return { error: NextResponse.json({ error: "Forbidden" }, { status: 403 }) }
  }
  return { user }
}

export async function GET() {
  const supabase = await createServerClient()
  const auth = await requireAdmin(supabase)
  if ("error" in auth && auth.error) return auth.error

  const admin = createServiceRoleClient()
  const { data, error } = await admin
    .from("discord_role_mappings")
    .select("*")
    .order("priority", { ascending: false })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ mappings: data ?? [] })
}

export async function POST(request: NextRequest) {
  const supabase = await createServerClient()
  const auth = await requireAdmin(supabase)
  if ("error" in auth && auth.error) return auth.error

  const body = await request.json()
  const parsed = createMappingSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid payload", details: parsed.error.flatten() },
      { status: 400 }
    )
  }

  const admin = createServiceRoleClient()
  const { data, error } = await admin
    .from("discord_role_mappings")
    .insert({
      discord_role_id: parsed.data.discord_role_id,
      discord_role_name: parsed.data.discord_role_name,
      app_role: parsed.data.app_role,
      priority: parsed.data.priority ?? 0,
      updated_at: new Date().toISOString(),
    })
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ mapping: data })
}

export async function DELETE(request: NextRequest) {
  const supabase = await createServerClient()
  const auth = await requireAdmin(supabase)
  if ("error" in auth && auth.error) return auth.error

  const id = request.nextUrl.searchParams.get("id")
  if (!id) {
    return NextResponse.json({ error: "id is required" }, { status: 400 })
  }

  const admin = createServiceRoleClient()
  const { error } = await admin.from("discord_role_mappings").delete().eq("id", id)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
