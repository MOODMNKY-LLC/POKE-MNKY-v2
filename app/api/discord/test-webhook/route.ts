import { NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase/server"

export async function POST(request: Request) {
  const supabase = await createServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const { webhook_url } = await request.json()

    if (!webhook_url) {
      return NextResponse.json({ error: "Webhook URL is required" }, { status: 400 })
    }

    // Test webhook by sending a test message
    const response = await fetch(webhook_url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        content: "🧪 Test webhook from POKE-MNKY admin panel",
        embeds: [
          {
            title: "Webhook Test",
            description: "This is a test message to verify your webhook is working correctly.",
            color: 0x00ff00,
            timestamp: new Date().toISOString(),
          },
        ],
      }),
    })

    if (!response.ok) {
      throw new Error(`Webhook test failed: ${response.statusText}`)
    }

    return NextResponse.json({ success: true, message: "Webhook test successful" })
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Webhook test failed" }, { status: 500 })
  }
}
