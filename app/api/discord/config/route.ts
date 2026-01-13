import { NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase/server"

export async function GET() {
  try {
    const supabase = await createServerClient()

    // Check if user is admin
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Check admin role from profiles table
    const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single()

    if (profile?.role !== "admin" && profile?.role !== "commissioner") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    // Return masked config (never expose actual secrets)
    const config = {
      botTokenMasked: process.env.DISCORD_BOT_TOKEN
        ? "••••••••••••••••" + process.env.DISCORD_BOT_TOKEN.slice(-4)
        : "Not set",
      clientId: process.env.DISCORD_CLIENT_ID || "Not set",
      clientSecretMasked: process.env.DISCORD_CLIENT_SECRET ? "••••••••••••••••" : "Not set",
      guildId: process.env.DISCORD_GUILD_ID || "Not set",
      publicKey: process.env.DISCORD_PUBLIC_KEY || "Not set",
      supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL || "",
    }

    return NextResponse.json(config)
  } catch (error) {
    console.error("[v0] Error fetching Discord config:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
