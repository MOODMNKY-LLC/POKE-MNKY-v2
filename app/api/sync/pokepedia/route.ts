/**
 * API Route: Trigger Pokepedia Sync
 * Proxies to Supabase Edge Function
 */

import { NextRequest, NextResponse } from "next/server"
import { createServiceRoleClient } from "@/lib/supabase/service"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { action, phase, priority, continueUntilComplete } = body

    if (!action || !phase) {
      return NextResponse.json(
        { error: "action and phase are required" },
        { status: 400 }
      )
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

    if (!supabaseUrl || !serviceRoleKey) {
      console.error("Missing Supabase configuration:", { 
        hasUrl: !!supabaseUrl, 
        hasKey: !!serviceRoleKey 
      })
      return NextResponse.json(
        { error: "Missing Supabase configuration" },
        { status: 500 }
      )
    }

    // Call Edge Function (always use service role key for auth)
    const functionUrl = `${supabaseUrl}/functions/v1/sync-pokepedia`
    
    console.log("Calling Edge Function:", functionUrl, { 
      action, 
      phase, 
      priority, 
      continueUntilComplete: continueUntilComplete === true 
    })
    
    // Always use service role key for Edge Function calls
    // Local Edge Functions served with --no-verify-jwt accept any token, but we use service role for consistency
    const isLocal = supabaseUrl.includes("127.0.0.1") || supabaseUrl.includes("localhost")
    const authKey = serviceRoleKey
    
    if (!authKey) {
      console.error("Missing service role key for Edge Function", {
        isLocal,
        hasServiceKey: !!serviceRoleKey,
      })
      return NextResponse.json(
        { error: "Missing service role key" },
        { status: 500 }
      )
    }
    
    console.log("Edge Function auth config:", {
      isLocal,
      functionUrl,
      authKeyPrefix: authKey.substring(0, 20) + "...",
      usingServiceRoleKey: true,
    })
    
    const response = await fetch(functionUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${authKey}`,
      },
      body: JSON.stringify({
        action,
        phase,
        priority: priority || "standard",
        continueUntilComplete: continueUntilComplete === true, // Only if explicitly true
      }),
    }).catch((fetchError) => {
      console.error("Failed to call Edge Function:", fetchError)
      throw new Error(`Edge Function call failed: ${fetchError.message}`)
    })

    // Handle non-JSON responses
    const contentType = response.headers.get("content-type")
    let data: any
    
    if (contentType?.includes("application/json")) {
      data = await response.json()
    } else {
      const text = await response.text()
      try {
        data = JSON.parse(text)
      } catch {
        data = { error: text || "Unknown error", status: response.status }
      }
    }

    if (!response.ok) {
      console.error("Edge Function returned error:", {
        status: response.status,
        statusText: response.statusText,
        data,
        functionUrl,
        isLocal,
      })
      return NextResponse.json(
        { 
          error: data.error || data.message || `Sync failed: ${response.status} ${response.statusText}`,
          details: isLocal ? "Check if Edge Function is running: supabase functions serve sync-pokepedia --no-verify-jwt" : undefined
        },
        { status: response.status }
      )
    }

    return NextResponse.json(data)
  } catch (error: any) {
    console.error("Error triggering sync:", error)
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    )
  }
}
