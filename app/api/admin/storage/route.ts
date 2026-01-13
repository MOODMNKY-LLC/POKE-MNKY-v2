import { NextRequest, NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase/server"
import { createClient } from "@supabase/supabase-js"

export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Use service role client for admin operations
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL

    if (!serviceRoleKey || !supabaseUrl) {
      return NextResponse.json(
        { error: "Service role key or Supabase URL not configured" },
        { status: 500 }
      )
    }

    const adminClient = createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    })

    const { data: buckets, error } = await adminClient.storage.listBuckets()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ buckets: buckets || [] })
  } catch (error: any) {
    console.error("Storage API error:", error)
    return NextResponse.json(
      { error: error.message || "Failed to fetch buckets" },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const { name, public: isPublic = false, fileSizeLimit = 52428800 } = body

    if (!name) {
      return NextResponse.json({ error: "Bucket name is required" }, { status: 400 })
    }

    // Use service role client for admin operations
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL

    if (!serviceRoleKey || !supabaseUrl) {
      return NextResponse.json(
        { error: "Service role key or Supabase URL not configured" },
        { status: 500 }
      )
    }

    const adminClient = createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    })

    const { data, error } = await adminClient.storage.createBucket(name, {
      public: isPublic,
      fileSizeLimit,
    })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ bucket: data })
  } catch (error: any) {
    console.error("Storage API error:", error)
    return NextResponse.json(
      { error: error.message || "Failed to create bucket" },
      { status: 500 }
    )
  }
}
