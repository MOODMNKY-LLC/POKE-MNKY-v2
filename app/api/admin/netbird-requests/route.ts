import { NextRequest, NextResponse } from "next/server"
import { requireLeagueAdmin } from "@/lib/admin-api-auth"
import { isReviewAction } from "@/lib/netbird/access-requests"
import {
  approveRequest,
  denyRequest,
  resendRequest,
  revokeRequest,
  type AdminActionResult,
  type FailureCode,
} from "@/lib/netbird/automation"

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

const STATUS_BY_FAILURE: Record<FailureCode, number> = {
  disabled: 503,
  rate_limited: 429,
  no_email: 422,
  forbidden: 403,
  invalid_state: 409,
  error: 500,
}

/** Applies an admin review action. Approve and resend also create the invite through the onboarding Worker. */
export async function PATCH(request: NextRequest) {
  const gate = await requireLeagueAdmin()
  if ("response" in gate) return gate.response

  let body: { id?: unknown; action?: unknown }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 })
  }

  const { id, action } = body
  if (typeof id !== "string" || !UUID_PATTERN.test(id)) {
    return NextResponse.json({ error: "Invalid request id" }, { status: 400 })
  }
  if (!isReviewAction(action)) {
    return NextResponse.json({ error: "Invalid action" }, { status: 400 })
  }

  let result: AdminActionResult
  switch (action) {
    case "approve":
      result = await approveRequest(id, gate.userId)
      break
    case "deny":
      result = await denyRequest(id, gate.userId)
      break
    case "revoke":
      result = await revokeRequest(id, gate.userId)
      break
    case "resend":
      result = await resendRequest(id, gate.userId)
      break
  }

  if (!result.ok) {
    return NextResponse.json(
      { error: result.message, request: result.request },
      { status: STATUS_BY_FAILURE[result.code] },
    )
  }
  return NextResponse.json({ request: result.request, paused: result.paused === true })
}
