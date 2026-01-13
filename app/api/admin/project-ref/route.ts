import { NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase/server"

export async function GET() {
  try {
    const supabase = await createServerClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Extract project ref from Supabase URL (server-side, always reliable)
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ""
    
    // Check if we're in local development
    const isLocal = supabaseUrl.includes("localhost") || supabaseUrl.includes("127.0.0.1")
    
    let projectRef = ""
    if (isLocal) {
      // For local development, use "local" as project ref
      // Note: Management API doesn't work with local Supabase, so this is mainly for UI consistency
      projectRef = "local"
    } else {
      // For production, extract from URL: https://{project-ref}.supabase.co
      projectRef = supabaseUrl.split("//")[1]?.split(".")[0] || ""
    }

    // Allow explicit override via env var (useful for local dev pointing to production)
    const explicitRef = process.env.NEXT_PUBLIC_SUPABASE_PROJECT_REF
    if (explicitRef) {
      projectRef = explicitRef
    }

    if (!projectRef) {
      return NextResponse.json(
        { 
          error: "Could not extract project reference from NEXT_PUBLIC_SUPABASE_URL",
          hint: isLocal 
            ? "For local development, Management API features are limited. Set NEXT_PUBLIC_SUPABASE_PROJECT_REF to your production project ref if needed."
            : "Check that NEXT_PUBLIC_SUPABASE_URL is in format: https://{project-ref}.supabase.co"
        },
        { status: 500 }
      )
    }

    return NextResponse.json({ projectRef, isLocal })
  } catch (error: any) {
    console.error("Project ref API error:", error)
    return NextResponse.json(
      { error: error.message || "Failed to get project reference" },
      { status: 500 }
    )
  }
}
