import { type NextRequest, NextResponse } from "next/server"
import { requireLeagueAdmin } from "@/lib/admin-api-auth"
import { supabaseManagementUrl } from "@/lib/proxy-allowlists"

async function authorizedManagementUrl(request: NextRequest, pathArray: string[]) {
  const admin = await requireLeagueAdmin()
  if ("response" in admin) return { response: admin.response }

  const path = pathArray.join("/")
  const url = supabaseManagementUrl(path, request.nextUrl.searchParams.toString())
  if (!url) {
    return {
      response: NextResponse.json(
        { error: "Forbidden — that Management API path is not allowed" },
        { status: 403 }
      ),
    }
  }
  return { url }
}

export async function GET(request: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  const { path: pathArray } = await params
  const gate = await authorizedManagementUrl(request, pathArray)
  if ("response" in gate) return gate.response

  const response = await fetch(gate.url, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${process.env.SUPABASE_MANAGEMENT_API_TOKEN}`,
      "Content-Type": "application/json",
    },
  })

  const data = await response.json()
  if (!response.ok) {
    return NextResponse.json(data, { status: response.status })
  }
  return NextResponse.json(data)
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  const { path: pathArray } = await params
  const gate = await authorizedManagementUrl(request, pathArray)
  if ("response" in gate) return gate.response

  const body = await request.json().catch(() => ({}))
  const path = pathArray.join("/")
  const forwardedBody =
    path.endsWith("/database/query") && body && typeof body === "object" && !Array.isArray(body)
      ? { ...body, read_only: true }
      : body

  const response = await fetch(gate.url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.SUPABASE_MANAGEMENT_API_TOKEN}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(forwardedBody),
  })

  const data = await response.json()
  if (!response.ok) {
    return NextResponse.json(data, { status: response.status })
  }
  return NextResponse.json(data)
}
