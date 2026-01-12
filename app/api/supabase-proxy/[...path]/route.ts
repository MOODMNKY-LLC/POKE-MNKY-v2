import { type NextRequest, NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase/server"

export async function GET(request: NextRequest, { params }: { params: { path: string[] } }) {
  const supabase = await createServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  // Forward request to Supabase Management API
  const path = params.path.join("/")
  const searchParams = request.nextUrl.searchParams.toString()
  const url = `https://api.supabase.com/${path}${searchParams ? `?${searchParams}` : ""}`

  const response = await fetch(url, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${process.env.SUPABASE_MANAGEMENT_API_TOKEN}`,
      "Content-Type": "application/json",
    },
  })

  const data = await response.json()
  return NextResponse.json(data)
}

export async function POST(request: NextRequest, { params }: { params: { path: string[] } }) {
  const supabase = await createServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const path = params.path.join("/")
  const url = `https://api.supabase.com/${path}`
  const body = await request.json()

  const response = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.SUPABASE_MANAGEMENT_API_TOKEN}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  })

  const data = await response.json()
  return NextResponse.json(data)
}
