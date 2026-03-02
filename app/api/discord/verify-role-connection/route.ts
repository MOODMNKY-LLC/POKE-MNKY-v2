/**
 * Discord Linked Roles: exchange OAuth code for token and update user's application role connection.
 * POST /api/discord/verify-role-connection
 * Body: { code: string }
 *
 * Requires: DISCORD_CLIENT_ID, DISCORD_CLIENT_SECRET
 * Redirect URI in Discord Developer Portal must match the callback URL used in /verify-user.
 */

import { NextRequest, NextResponse } from "next/server"

const DISCORD_TOKEN_URL = "https://discord.com/api/oauth2/token"
const DISCORD_ME_URL = "https://discord.com/api/v10/users/@me"
const DISCORD_ROLE_CONNECTION_URL = (appId: string) =>
  `https://discord.com/api/v10/users/@me/applications/${appId}/role-connection`

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}))
    const code = body?.code as string | undefined

    if (!code?.trim()) {
      return NextResponse.json({ error: "Missing authorization code" }, { status: 400 })
    }

    const clientId = process.env.DISCORD_CLIENT_ID
    const clientSecret = process.env.DISCORD_CLIENT_SECRET

    if (!clientId || !clientSecret) {
      return NextResponse.json(
        { error: "Discord OAuth not configured (DISCORD_CLIENT_ID / DISCORD_CLIENT_SECRET)" },
        { status: 500 }
      )
    }

    const redirectUri = `${process.env.NEXT_PUBLIC_APP_URL || request.nextUrl.origin}/verify-user/callback`

    // Exchange code for access token
    const tokenRes = await fetch(DISCORD_TOKEN_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        grant_type: "authorization_code",
        code: code.trim(),
        redirect_uri: redirectUri,
      }),
    })

    const tokenData = await tokenRes.json().catch(() => ({}))
    if (!tokenRes.ok) {
      return NextResponse.json(
        { error: tokenData.error_description || tokenData.error || "Token exchange failed" },
        { status: 400 }
      )
    }

    const accessToken = tokenData.access_token as string
    if (!accessToken) {
      return NextResponse.json({ error: "No access token in response" }, { status: 400 })
    }

    // Update application role connection metadata (Linked Roles)
    // Use minimal metadata; server admins can define metadata in Developer Portal
    const roleConnectionRes = await fetch(DISCORD_ROLE_CONNECTION_URL(clientId), {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        platform_name: "POKE MNKY",
        platform_username: null, // optional: set from /users/@me if needed
        metadata: {},
        metadata_visibility: 0, // none visible to server
      }),
    })

    if (!roleConnectionRes.ok) {
      const errData = await roleConnectionRes.json().catch(() => ({}))
      // If metadata not configured in Discord, 400 is possible; still consider user "connected"
      if (roleConnectionRes.status === 400 && errData.code === 50035) {
        return NextResponse.json({
          message: "Connected. Role metadata may not be configured in the Discord app yet.",
        })
      }
      return NextResponse.json(
        { error: errData.message || "Failed to update role connection" },
        { status: roleConnectionRes.status }
      )
    }

    return NextResponse.json({
      message: "Your Discord account is connected for role verification. You can return to Discord.",
    })
  } catch (e) {
    console.error("[verify-role-connection]", e)
    return NextResponse.json({ error: "Verification failed" }, { status: 500 })
  }
}
