import { NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase/server"
import { createClient } from "@supabase/supabase-js"

const REQUIRED_BUCKETS = [
  {
    name: "team-assets",
    public: true,
    fileSizeLimit: 5 * 1024 * 1024, // 5MB
    description: "Team avatars and logos (profile Coach Card)",
  },
] as const

/**
 * POST /api/admin/storage/ensure-buckets
 * Creates required storage buckets if they don't exist. Admin/commissioner only.
 * Used so profile image upload (team-assets) works without manual Dashboard setup.
 */
export async function POST() {
  try {
    const supabase = await createServerClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single()

    const role = profile?.role
    if (role !== "admin" && role !== "commissioner") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    if (!serviceRoleKey || !supabaseUrl) {
      return NextResponse.json(
        { error: "Service role key or Supabase URL not configured" },
        { status: 500 }
      )
    }

    const adminClient = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    })

    const { data: existing } = await adminClient.storage.listBuckets()
    const existingNames = new Set((existing || []).map((b) => b.name))
    const created: string[] = []
    const errors: { bucket: string; error: string }[] = []

    for (const spec of REQUIRED_BUCKETS) {
      if (existingNames.has(spec.name)) continue
      const { data, error } = await adminClient.storage.createBucket(spec.name, {
        public: spec.public,
        fileSizeLimit: spec.fileSizeLimit,
      })
      if (error) {
        errors.push({ bucket: spec.name, error: error.message })
        continue
      }
      if (data) created.push(spec.name)
      existingNames.add(spec.name)
    }

    return NextResponse.json({
      created,
      existing: (existing || []).map((b) => b.name),
      errors: errors.length ? errors : undefined,
    })
  } catch (err: unknown) {
    console.error("ensure-buckets error:", err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to ensure buckets" },
      { status: 500 }
    )
  }
}
