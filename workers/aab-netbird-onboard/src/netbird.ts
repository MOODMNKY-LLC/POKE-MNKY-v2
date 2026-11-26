import type { Env } from "./types"
import { redact } from "./util"

const REQUEST_TIMEOUT_MS = 10_000

export class NetbirdError extends Error {
  readonly status: number
  constructor(status: number, message: string) {
    super(message)
    this.name = "NetbirdError"
    this.status = status
  }
}

export interface NetbirdUser {
  id: string
  email?: string
  role?: string
  auto_groups?: string[]
  is_service_user?: boolean
  is_blocked?: boolean
}

export interface NetbirdInvite {
  id: string
  email?: string
  expires_at?: string
  expired?: boolean
}

export interface CreatedInvite {
  id: string
  invite_token: string
  expires_at?: string
}

export interface RegeneratedInvite {
  invite_token: string
  invite_expires_at?: string
}

export function normalizeEmail(email: string | undefined): string {
  return (email ?? "").trim().toLowerCase()
}

export class NetbirdClient {
  private readonly base: string
  private readonly token: string

  constructor(env: Env) {
    this.base = (env.NETBIRD_API_BASE ?? "").replace(/\/+$/, "")
    this.token = env.NETBIRD_API_TOKEN ?? ""
  }

  private async request<T>(method: string, path: string, body?: unknown): Promise<T> {
    let response: Response
    try {
      response = await fetch(`${this.base}${path}`, {
        method,
        headers: {
          Authorization: `Token ${this.token}`,
          Accept: "application/json",
          ...(body === undefined ? {} : { "Content-Type": "application/json" }),
        },
        body: body === undefined ? undefined : JSON.stringify(body),
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      })
    } catch (error) {
      const timedOut = error instanceof Error && (error.name === "TimeoutError" || error.name === "AbortError")
      throw new NetbirdError(504, timedOut ? "NetBird took too long to answer." : "Could not reach NetBird.")
    }

    const text = await response.text().catch(() => "")
    if (!response.ok) {
      let detail = ""
      try {
        const parsed = JSON.parse(text) as { message?: unknown }
        if (typeof parsed.message === "string") detail = redact(parsed.message, [this.token])
      } catch {
        detail = ""
      }
      throw new NetbirdError(response.status, `NetBird returned HTTP ${response.status}${detail ? `: ${detail}` : ""}`)
    }
    if (!text) return undefined as T
    try {
      return JSON.parse(text) as T
    } catch {
      throw new NetbirdError(502, "NetBird sent an unreadable response.")
    }
  }

  async listUsers(): Promise<NetbirdUser[]> {
    const users = await this.request<NetbirdUser[] | null>("GET", "/api/users")
    return Array.isArray(users) ? users : []
  }

  async listInvites(): Promise<NetbirdInvite[]> {
    const invites = await this.request<NetbirdInvite[] | null>("GET", "/api/users/invites")
    return Array.isArray(invites) ? invites : []
  }

  createInvite(input: { email: string; name: string; groupId: string; expiresIn: number }): Promise<CreatedInvite> {
    // Role and group are fixed on purpose: members are always plain users in the one league group.
    return this.request<CreatedInvite>("POST", "/api/users/invites", {
      email: input.email,
      name: input.name,
      role: "user",
      auto_groups: [input.groupId],
      expires_in: input.expiresIn,
    })
  }

  regenerateInvite(inviteId: string, expiresIn: number): Promise<RegeneratedInvite> {
    return this.request<RegeneratedInvite>("POST", `/api/users/invites/${encodeURIComponent(inviteId)}/regenerate`, {
      expires_in: expiresIn,
    })
  }

  async deleteInvite(inviteId: string): Promise<void> {
    await this.request<void>("DELETE", `/api/users/invites/${encodeURIComponent(inviteId)}`)
  }

  /** Blocks (never deletes) a user. Role and groups are passed back unchanged. */
  async blockUser(user: NetbirdUser): Promise<void> {
    await this.request<unknown>("PUT", `/api/users/${encodeURIComponent(user.id)}`, {
      role: user.role,
      auto_groups: user.auto_groups ?? [],
      is_blocked: true,
    })
  }
}

export function isPendingInvite(invite: NetbirdInvite, nowMs: number = Date.now()): boolean {
  if (invite.expired) return false
  if (invite.expires_at) {
    const expiry = Date.parse(invite.expires_at)
    if (Number.isFinite(expiry) && expiry <= nowMs) return false
  }
  return true
}
