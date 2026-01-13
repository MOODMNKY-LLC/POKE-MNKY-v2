/**
 * Test Edge Function Connectivity
 * Simple endpoint to verify edge function is accessible
 */

import { NextResponse } from "next/server"
import { createServiceRoleClient } from "@/lib/supabase/service"

export async function GET() {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

    if (!supabaseUrl || !serviceRoleKey) {
      return NextResponse.json(
        {
          connected: false,
          error: "Missing Supabase configuration",
          hasUrl: !!supabaseUrl,
          hasKey: !!serviceRoleKey,
        },
        { status: 500 }
      )
    }

    // Test database connectivity first
    const supabase = createServiceRoleClient()
    const { data: testData, error: dbError } = await supabase
      .from("sync_jobs")
      .select("job_id")
      .limit(1)

    if (dbError) {
      return NextResponse.json(
        {
          connected: false,
          error: "Database connection failed",
          dbError: dbError.message,
        },
        { status: 500 }
      )
    }

    // Test edge function connectivity
    const functionUrl = `${supabaseUrl}/functions/v1/sync-pokepedia`
    const isLocal = supabaseUrl.includes("127.0.0.1") || supabaseUrl.includes("localhost")

    try {
      const response = await fetch(functionUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${serviceRoleKey}`,
        },
        body: JSON.stringify({
          action: "test",
          phase: "master",
        }),
      })

      const responseText = await response.text()
      let responseData: any
      try {
        responseData = JSON.parse(responseText)
      } catch {
        responseData = { raw: responseText }
      }

      return NextResponse.json({
        connected: true,
        database: {
          connected: true,
          canQuery: true,
        },
        edgeFunction: {
          url: functionUrl,
          accessible: response.ok,
          status: response.status,
          isLocal,
          response: responseData,
        },
        configuration: {
          supabaseUrl: supabaseUrl.substring(0, 30) + "...",
          hasServiceKey: !!serviceRoleKey,
        },
      })
    } catch (fetchError: any) {
      return NextResponse.json(
        {
          connected: false,
          database: {
            connected: true,
            canQuery: true,
          },
          edgeFunction: {
            url: functionUrl,
            accessible: false,
            error: fetchError.message,
            isLocal,
            note: isLocal
              ? "Make sure Edge Function is running: supabase functions serve sync-pokepedia --no-verify-jwt"
              : "Check Edge Function deployment status",
          },
        },
        { status: 200 } // Return 200 but with connected: false
      )
    }
  } catch (error: any) {
    return NextResponse.json(
      {
        connected: false,
        error: error.message || "Unknown error",
      },
      { status: 500 }
    )
  }
}
