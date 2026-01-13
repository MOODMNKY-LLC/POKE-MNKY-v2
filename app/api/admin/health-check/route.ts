import { NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase/server"
import createClient from "openapi-fetch"
import type { paths } from "@/lib/management-api-schema"

const managementClient = createClient<paths>({
  baseUrl: "https://api.supabase.com",
  headers: {
    Authorization: `Bearer ${process.env.SUPABASE_MANAGEMENT_API_TOKEN}`,
  },
})

export async function GET() {
  try {
    const supabase = await createServerClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Extract project ref from URL
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ""
    const projectRef = supabaseUrl.split("//")[1]?.split(".")[0] || ""

    // Check secrets (server-side only)
    const secrets = {
      NEXT_PUBLIC_SUPABASE_URL: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
      NEXT_PUBLIC_SUPABASE_ANON_KEY: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      SUPABASE_SERVICE_ROLE_KEY: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
      SUPABASE_MANAGEMENT_API_TOKEN: !!process.env.SUPABASE_MANAGEMENT_API_TOKEN,
      DISCORD_BOT_TOKEN: !!process.env.DISCORD_BOT_TOKEN,
      DISCORD_CLIENT_ID: !!process.env.DISCORD_CLIENT_ID,
      DISCORD_CLIENT_SECRET: !!process.env.DISCORD_CLIENT_SECRET,
      NEXT_PUBLIC_DISCORD_CLIENT_ID: !!process.env.NEXT_PUBLIC_DISCORD_CLIENT_ID,
      OPENAI_API_KEY: !!process.env.OPENAI_API_KEY,
      GOOGLE_SHEETS_ID: !!process.env.GOOGLE_SHEETS_ID,
    }

    // Check Discord OAuth provider status via Management API
    let discordOAuthEnabled = false
    let discordOAuthDetails = null
    try {
      if (projectRef && process.env.SUPABASE_MANAGEMENT_API_TOKEN) {
        try {
          const { data: authConfig, error: authError } = await managementClient.GET(
            "/v1/projects/{ref}/config/auth",
            {
              params: { path: { ref: projectRef } },
            }
          )

          if (!authError && authConfig) {
            // Check if Discord is enabled in Supabase config
            const discordEnabled = (authConfig as any)?.EXTERNAL_DISCORD_ENABLED === true ||
                                   (authConfig as any)?.EXTERNAL_DISCORD_ENABLED === "true"
            
            if (discordEnabled) {
              discordOAuthEnabled = true
              discordOAuthDetails = {
                enabled: true,
                clientId: (authConfig as any)?.EXTERNAL_DISCORD_CLIENT_ID || "configured",
              }
            }
          }
        } catch (apiError: any) {
          console.warn("Management API check failed, using fallback:", apiError.message)
          // Fallback: check if we have Discord credentials
          discordOAuthEnabled = !!(process.env.DISCORD_CLIENT_ID || process.env.NEXT_PUBLIC_DISCORD_CLIENT_ID)
        }
      } else {
        // Fallback: check if we have Discord credentials
        discordOAuthEnabled = !!(process.env.DISCORD_CLIENT_ID || process.env.NEXT_PUBLIC_DISCORD_CLIENT_ID)
      }
    } catch (error) {
      console.error("Error checking Discord OAuth:", error)
      // Fallback: check if we have Discord credentials
      discordOAuthEnabled = !!(process.env.DISCORD_CLIENT_ID || process.env.NEXT_PUBLIC_DISCORD_CLIENT_ID)
    }

    // Check integrations
    const integrations = {
      supabase: !!process.env.NEXT_PUBLIC_SUPABASE_URL && !!process.env.SUPABASE_SERVICE_ROLE_KEY,
      discordBot: !!process.env.DISCORD_BOT_TOKEN,
      discordOAuth: discordOAuthEnabled,
      openai: !!process.env.OPENAI_API_KEY,
      googleSheets: !!process.env.GOOGLE_SHEETS_ID,
      managementApi: !!process.env.SUPABASE_MANAGEMENT_API_TOKEN,
    }

    return NextResponse.json({
      secrets,
      integrations,
      discordOAuth: {
        enabled: discordOAuthEnabled,
        details: discordOAuthDetails,
      },
      projectRef,
    })
  } catch (error: any) {
    console.error("Health check error:", error)
    return NextResponse.json(
      { error: error.message || "Health check failed" },
      { status: 500 }
    )
  }
}
