import { readFileSync } from "node:fs"
import path from "node:path"
import vm from "node:vm"
import { describe, expect, it, vi } from "vitest"

const SW_SOURCE = readFileSync(path.join(process.cwd(), "public/sw.js"), "utf8")
const ORIGIN = "https://league.example"

type Listener = (event: any) => void

/** Service workers resolve relative URLs against their own origin; Node's Request does not. */
class WorkerRequest extends Request {
  constructor(input: RequestInfo | URL, init?: RequestInit) {
    super(typeof input === "string" ? new URL(input, ORIGIN).toString() : input, init)
  }
}

function htmlResponse(body: string, init: ResponseInit = {}) {
  return new Response(body, { status: 200, headers: { "Content-Type": "text/html" }, ...init })
}

/** Minimal in-memory Cache Storage keyed by URL path. */
function createCaches(initial: Record<string, Record<string, Response>> = {}) {
  const stores = new Map<string, Map<string, Response>>()
  for (const [name, entries] of Object.entries(initial)) stores.set(name, new Map(Object.entries(entries)))
  const keyOf = (input: Request | string) => {
    const raw = typeof input === "string" ? input : input.url
    const url = new URL(raw, ORIGIN)
    return url.pathname + url.search
  }
  const open = async (name: string) => {
    if (!stores.has(name)) stores.set(name, new Map())
    const store = stores.get(name)!
    return {
      put: async (req: Request | string, res: Response) => void store.set(keyOf(req), res),
      add: async (req: Request | string) => {
        const res = await fetchMock(req instanceof Request ? req : new Request(new URL(req, ORIGIN)))
        if (!res.ok) throw new Error("add failed")
        store.set(keyOf(req), res)
      },
    }
  }
  const match = async (req: Request | string) => {
    for (const store of stores.values()) {
      const hit = store.get(keyOf(req))
      if (hit) return hit.clone()
    }
    return undefined
  }
  return {
    stores,
    api: {
      open,
      match,
      keys: async () => Array.from(stores.keys()),
      delete: async (name: string) => stores.delete(name),
    },
  }
}

let fetchMock: (req: Request | string) => Promise<Response>

function loadServiceWorker(options: {
  hostname?: string
  caches?: Record<string, Record<string, Response>>
  fetch: (req: Request | string) => Promise<Response>
}) {
  const listeners: Record<string, Listener> = {}
  const cacheState = createCaches(options.caches)
  fetchMock = options.fetch
  const waitUntilPromises: Promise<unknown>[] = []
  const sandbox: Record<string, unknown> = {
    console: { log: () => {} },
    URL,
    Request: WorkerRequest,
    Response,
    Headers,
    caches: cacheState.api,
    fetch: (req: Request | string) => fetchMock(req),
  }
  sandbox.self = {
    location: { hostname: options.hostname ?? "league.example", origin: ORIGIN },
    addEventListener: (type: string, listener: Listener) => {
      listeners[type] = listener
    },
    skipWaiting: vi.fn(),
    clients: { claim: vi.fn(async () => {}) },
  }
  vm.createContext(sandbox)
  vm.runInContext(SW_SOURCE, sandbox)

  const install = async () => {
    const event = { waitUntil: (p: Promise<unknown>) => void waitUntilPromises.push(p) }
    listeners.install(event)
    await Promise.all(waitUntilPromises.splice(0))
  }
  const activate = async () => {
    const event = { waitUntil: (p: Promise<unknown>) => void waitUntilPromises.push(p) }
    listeners.activate(event)
    await Promise.all(waitUntilPromises.splice(0))
  }
  const dispatchFetch = async (request: Request) => {
    let responded: Promise<Response> | undefined
    listeners.fetch({ request, respondWith: (p: Promise<Response>) => (responded = p) })
    return responded ? await responded : undefined
  }
  return { install, activate, dispatchFetch, cacheState }
}

function navigation(pathname: string) {
  const request = new Request(`${ORIGIN}${pathname}`)
  Object.defineProperty(request, "mode", { value: "navigate" })
  return request
}

const OFFLINE_HTML = `<html><script src="/_next/static/chunks/offline-abc.js"></script><link href="/_next/static/css/app.css"></html>`

function onlineFetch(req: Request | string) {
  const url = new URL(typeof req === "string" ? req : req.url, ORIGIN)
  if (url.pathname === "/offline") return Promise.resolve(htmlResponse(OFFLINE_HTML))
  if (url.pathname.startsWith("/_next/static/")) return Promise.resolve(new Response("asset"))
  return Promise.resolve(htmlResponse(`<p>${url.pathname}</p>`))
}

describe("service worker", () => {
  it("precaches /offline and its assets at install", async () => {
    const sw = loadServiceWorker({ fetch: onlineFetch })
    await sw.install()
    const staticStore = sw.cacheState.stores.get("aab-battle-league-v3-static")!
    expect(staticStore.has("/offline")).toBe(true)
    expect(staticStore.has("/_next/static/chunks/offline-abc.js")).toBe(true)
    expect(staticStore.has("/_next/static/css/app.css")).toBe(true)
  })

  it("fails the install when /offline cannot be precached", async () => {
    const sw = loadServiceWorker({
      fetch: (req) =>
        new URL(typeof req === "string" ? req : req.url, ORIGIN).pathname === "/offline"
          ? Promise.resolve(new Response("nope", { status: 500 }))
          : onlineFetch(req),
    })
    await expect(sw.install()).rejects.toThrow(/offline/)
  })

  it("serves /offline for the first failed navigation after install", async () => {
    let online = true
    const sw = loadServiceWorker({
      fetch: (req) => (online ? onlineFetch(req) : Promise.reject(new TypeError("offline"))),
    })
    await sw.install()
    online = false
    const response = await sw.dispatchFetch(navigation("/standings"))
    expect(await response!.text()).toBe(OFFLINE_HTML)
  })

  it("falls back to /offline instead of cached copies for dashboard navigations", async () => {
    let online = true
    const sw = loadServiceWorker({
      fetch: (req) => (online ? onlineFetch(req) : Promise.reject(new TypeError("offline"))),
    })
    await sw.install()
    await sw.dispatchFetch(navigation("/dashboard"))
    const dynamic = sw.cacheState.stores.get("aab-battle-league-v3-dynamic")
    expect(dynamic?.has("/dashboard") ?? false).toBe(false)
    online = false
    const response = await sw.dispatchFetch(navigation("/dashboard"))
    expect(await response!.text()).toBe(OFFLINE_HTML)
  })

  it("does not store responses marked private or no-store", async () => {
    const sw = loadServiceWorker({
      fetch: () => Promise.resolve(htmlResponse("secret", { headers: { "Cache-Control": "private, no-store" } })),
    })
    await sw.dispatchFetch(navigation("/teams"))
    expect(sw.cacheState.stores.get("aab-battle-league-v3-dynamic")?.has("/teams") ?? false).toBe(false)
  })

  it("never handles API, auth, RSC or cross-origin requests", async () => {
    const sw = loadServiceWorker({ fetch: onlineFetch })
    const requests = [
      new Request(`${ORIGIN}/api/standings`),
      new Request(`${ORIGIN}/auth/login`),
      new Request(`${ORIGIN}/standings?_rsc=abc`),
      new Request(`${ORIGIN}/standings`, { headers: { RSC: "1" } }),
      new Request("https://abcd.supabase.co/rest/v1/teams"),
      new Request("https://abcd.supabase.co/auth/v1/user"),
    ]
    for (const request of requests) {
      expect(await sw.dispatchFetch(request)).toBeUndefined()
    }
    expect(sw.cacheState.stores.size).toBe(0)
  })

  it("deletes caches from older versions on activate", async () => {
    const sw = loadServiceWorker({
      fetch: onlineFetch,
      caches: {
        "aab-battle-league-v2-static": {},
        "aab-battle-league-v2-api": {},
        "aab-battle-league-v3-static": {},
        "unrelated-cache": {},
      },
    })
    await sw.activate()
    expect(Array.from(sw.cacheState.stores.keys()).sort()).toEqual(["aab-battle-league-v3-static", "unrelated-cache"])
  })

  it("stays out of the way on localhost", async () => {
    const sw = loadServiceWorker({ hostname: "localhost", fetch: onlineFetch })
    await sw.install()
    expect(sw.cacheState.stores.size).toBe(0)
    expect(await sw.dispatchFetch(navigation("/standings"))).toBeUndefined()
  })
})
