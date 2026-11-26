import { handleInvite, handleNotifyAdmins, handleRevoke } from "./handlers"
import type { Env } from "./types"
import { errorResponse } from "./util"
import { SIGNATURE_HEADER, TIMESTAMP_HEADER, verifySignature } from "./worker-signing"

const MAX_BODY_BYTES = 16 * 1024

const ROUTES: Record<string, (env: Env, payload: Record<string, unknown>) => Promise<Response>> = {
  "/invite": handleInvite,
  "/revoke": handleRevoke,
  "/notify-admins": handleNotifyAdmins,
}

/** The kill switch: only the exact string "true" turns the Worker on. */
export function isEnabled(env: Env): boolean {
  return env.ONBOARDING_ENABLED === "true"
}

export async function handleRequest(request: Request, env: Env): Promise<Response> {
  const path = new URL(request.url).pathname.replace(/\/+$/, "") || "/"
  const handler = ROUTES[path]
  if (!handler) return errorResponse(404, "Not found.")
  if (request.method !== "POST") {
    const response = errorResponse(405, "Use POST.")
    response.headers.set("allow", "POST")
    return response
  }

  const body = await request.text()
  if (body.length > MAX_BODY_BYTES) return errorResponse(413, "Request too large.")

  if (!env.SIGNING_SECRET) return errorResponse(503, "The onboarding worker is not configured.")
  const verified = await verifySignature(
    env.SIGNING_SECRET,
    request.headers.get(TIMESTAMP_HEADER),
    body,
    request.headers.get(SIGNATURE_HEADER),
  )
  if (!verified.ok) return errorResponse(401, "Unauthorized.")

  if (!isEnabled(env)) return errorResponse(503, "Battle network onboarding is paused.")

  let payload: unknown
  try {
    payload = JSON.parse(body)
  } catch {
    return errorResponse(400, "Body must be JSON.")
  }
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) return errorResponse(400, "Body must be a JSON object.")

  return handler(env, payload as Record<string, unknown>)
}

export default {
  fetch(request: Request, env: Env): Promise<Response> {
    return handleRequest(request, env)
  },
}
