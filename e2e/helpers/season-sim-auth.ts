/**
 * Cookie injection for disposable GoTrue password sessions (same shape as
 * scripts/season-sim/real-server-auth-e2e.ts). Never logs tokens/passwords.
 */

import { createChunks, stringToBase64URL } from "@supabase/ssr"
import type { BrowserContext, Page } from "@playwright/test"

export function storageKeyForUrl(url: string): string {
  const host = new URL(url).hostname.split(".")[0] || "localhost"
  return `sb-${host}-auth-token`
}

export async function passwordGrant(args: {
  supabaseUrl: string
  anonKey: string
  email: string
  password: string
}): Promise<Record<string, unknown>> {
  const res = await fetch(
    `${args.supabaseUrl.replace(/\/$/, "")}/auth/v1/token?grant_type=password`,
    {
      method: "POST",
      headers: {
        apikey: args.anonKey,
        Authorization: `Bearer ${args.anonKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ email: args.email, password: args.password }),
    },
  )
  const body = (await res.json()) as Record<string, unknown>
  if (!res.ok || !body.access_token) {
    throw new Error(`password grant failed status=${res.status}`)
  }
  return body
}

export async function injectSessionCookies(
  context: BrowserContext,
  args: {
    appOrigin: string
    supabaseUrl: string
    session: Record<string, unknown>
  },
): Promise<void> {
  const key = storageKeyForUrl(args.supabaseUrl)
  const raw = JSON.stringify(args.session)
  const encoded = `base64-${stringToBase64URL(raw)}`
  const chunks = createChunks(key, encoded)
  const origin = new URL(args.appOrigin)
  await context.addCookies(
    chunks.map((c) => ({
      name: c.name,
      value: c.value,
      domain: origin.hostname,
      path: "/",
      httpOnly: false,
      secure: origin.protocol === "https:",
      sameSite: "Lax" as const,
    })),
  )
}

export async function signInAs(
  page: Page,
  args: {
    appOrigin: string
    supabaseUrl: string
    anonKey: string
    email: string
    password: string
  },
): Promise<Record<string, unknown>> {
  const session = await passwordGrant(args)
  await injectSessionCookies(page.context(), {
    appOrigin: args.appOrigin,
    supabaseUrl: args.supabaseUrl,
    session,
  })
  return session
}

/**
 * Assert page scripts never received a worker secret env leak.
 * Retries across soft navigations (auth cookie hydration can remount the
 * document and destroy the evaluate context mid-call on CI).
 */
export async function assertNoWorkerKeyInPage(page: Page): Promise<void> {
  const probe = async () =>
    page.evaluate(() => {
      const html = document.documentElement.innerHTML
      const keys = Object.keys(window as unknown as Record<string, unknown>)
      const blob = `${html}\n${keys.join("\n")}`
      return /SIMULATION_WORKER_KEY|local-disposable-sim-worker/i.test(blob)
    })

  let lastError: unknown
  for (let attempt = 0; attempt < 5; attempt++) {
    try {
      await page.waitForLoadState("domcontentloaded")
      const leaked = await probe()
      if (leaked) {
        throw new Error("Worker secret material appears in page DOM/window")
      }
      return
    } catch (err) {
      lastError = err
      const msg = err instanceof Error ? err.message : String(err)
      if (
        /Execution context was destroyed|Target closed|navigation/i.test(msg)
      ) {
        await page.waitForLoadState("domcontentloaded").catch(() => {})
        await page.waitForTimeout(150)
        continue
      }
      throw err
    }
  }
  throw lastError instanceof Error
    ? lastError
    : new Error(`assertNoWorkerKeyInPage failed: ${String(lastError)}`)
}
