import { randomUUID } from "crypto"
import type { GatewayFrame } from "./types"
import type { OpenClawConfig } from "./config"

type PendingRequest = {
  resolve: (value: unknown) => void
  reject: (error: Error) => void
  timer: ReturnType<typeof setTimeout>
}

export class OpenClawGatewayClient {
  private ws: WebSocket | null = null
  private pending = new Map<string, PendingRequest>()
  private connected = false
  private grantedScopes: string[] = []
  private eventQueue: GatewayFrame[] = []
  private eventWaiters: Array<(frame: GatewayFrame) => void> = []

  constructor(private readonly config: OpenClawConfig) {}

  getScopes(): string[] {
    return [...this.grantedScopes]
  }

  requireScope(scope: string): void {
    if (!this.grantedScopes.includes(scope)) {
      throw new Error(
        `missing scope: ${scope}. Granted: [${this.grantedScopes.join(", ") || "none"}]. ` +
          `Use gateway.auth.token with operator.write (not hooks.token). ` +
          `For in-app chat, defaults are OPENCLAW_CLIENT_ID=webchat-ui and OPENCLAW_CLIENT_MODE=webchat.`
      )
    }
  }

  async connect(timeoutMs = 20_000): Promise<void> {
    if (this.connected && this.ws?.readyState === WebSocket.OPEN) {
      return
    }

    await this.openSocket(timeoutMs)
    await this.handshake(timeoutMs)
    this.connected = true
  }

  private openSocket(timeoutMs: number): Promise<void> {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        reject(new Error(`OpenClaw gateway connect timed out after ${timeoutMs}ms`))
      }, timeoutMs)

      try {
        const ws = new WebSocket(this.config.gatewayUrl)
        this.ws = ws

        ws.addEventListener("open", () => {
          clearTimeout(timer)
          resolve()
        })

        ws.addEventListener("error", () => {
          clearTimeout(timer)
          reject(new Error("OpenClaw gateway WebSocket error"))
        })

        ws.addEventListener("close", () => {
          this.connected = false
        })

        ws.addEventListener("message", (ev) => {
          this.onMessage(String(ev.data))
        })
      } catch (error) {
        clearTimeout(timer)
        reject(error instanceof Error ? error : new Error(String(error)))
      }
    })
  }

  private onMessage(raw: string): void {
    let frame: GatewayFrame
    try {
      frame = JSON.parse(raw) as GatewayFrame
    } catch {
      return
    }

    if (frame.type === "res") {
      const pending = this.pending.get(frame.id)
      if (!pending) return
      clearTimeout(pending.timer)
      this.pending.delete(frame.id)
      if (frame.ok) {
        pending.resolve(frame.payload)
      } else {
        pending.reject(new Error(formatGatewayError(frame.error)))
      }
      return
    }

    if (frame.type === "event") {
      if (this.eventWaiters.length > 0) {
        const waiter = this.eventWaiters.shift()
        waiter?.(frame)
      } else {
        this.eventQueue.push(frame)
      }
    }
  }

  private async waitForEvent(
    predicate: (frame: GatewayFrame) => boolean,
    timeoutMs: number
  ): Promise<GatewayFrame> {
    const queued = this.eventQueue.find(predicate)
    if (queued) {
      this.eventQueue = this.eventQueue.filter((f) => f !== queued)
      return queued
    }

    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        reject(new Error("Timed out waiting for gateway event"))
      }, timeoutMs)

      const waiter = (frame: GatewayFrame) => {
        if (!predicate(frame)) {
          this.eventQueue.push(frame)
          this.eventWaiters.push(waiter)
          return
        }
        clearTimeout(timer)
        resolve(frame)
      }
      this.eventWaiters.push(waiter)
    })
  }

  private async handshake(timeoutMs: number): Promise<void> {
    await this.waitForEvent((f) => f.type === "event" && f.event === "connect.challenge", timeoutMs)

    const id = randomUUID()
    const params = {
      minProtocol: 3,
      maxProtocol: 4,
      client: {
        id: this.config.clientId,
        version: "1.0.0",
        platform: "node",
        mode: this.config.clientMode,
      },
      role: "operator",
      scopes: ["operator.read", "operator.write"],
      caps: [],
      commands: [],
      permissions: {},
      auth: this.config.gatewayToken ? { token: this.config.gatewayToken } : {},
      locale: "en-US",
      userAgent: "poke-mnky-nextjs/1.0.0",
    }

    const hello = (await this.request("connect", params, timeoutMs)) as {
      auth?: { scopes?: string[]; role?: string }
      type?: string
    } | null
    if (process.env.LOG_OPENCLAW_HELLO === "1") {
      console.log("[OpenClaw] hello-ok:", JSON.stringify(hello, null, 2))
    }
    this.grantedScopes = Array.isArray(hello?.auth?.scopes) ? hello.auth.scopes : []
  }

  async request(method: string, params?: unknown, timeoutMs = 30_000): Promise<unknown> {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      throw new Error("OpenClaw gateway is not connected")
    }

    const id = randomUUID()
    const frame: GatewayFrame = { type: "req", id, method, params }

    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        this.pending.delete(id)
        reject(new Error(`OpenClaw RPC ${method} timed out`))
      }, timeoutMs)

      this.pending.set(id, { resolve, reject, timer })
      this.ws!.send(JSON.stringify(frame))
    })
  }

  async *streamChatEvents(timeoutMs = 120_000): AsyncGenerator<GatewayFrame> {
    const deadline = Date.now() + timeoutMs
    while (Date.now() < deadline) {
      const remaining = Math.max(1_000, deadline - Date.now())
      const frame = await this.waitForEvent(
        (f) => f.type === "event",
        remaining
      )
      yield frame
      if (isTerminal(frame)) break
    }
  }

  close(): void {
    for (const [, pending] of this.pending) {
      clearTimeout(pending.timer)
      pending.reject(new Error("Gateway client closed"))
    }
    this.pending.clear()
    this.ws?.close()
    this.ws = null
    this.connected = false
  }
}

function formatGatewayError(error: unknown): string {
  if (typeof error === "string") return error
  if (error && typeof error === "object") {
    const record = error as { message?: string; code?: string }
    if (record.message) {
      return record.code ? `${record.code}: ${record.message}` : record.message
    }
    return JSON.stringify(error)
  }
  return "Gateway request failed"
}

function isTerminal(frame: GatewayFrame): boolean {
  if (frame.type !== "event") return false
  if (frame.event === "chat") {
    const payload = frame.payload as Record<string, unknown> | undefined
    const state = payload?.state
    return state === "done" || state === "error" || state === "aborted"
  }
  return false
}
