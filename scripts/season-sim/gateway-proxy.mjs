/**
 * Loopback-only gateway: /auth/v1 → GoTrue, /rest/v1 → PostgREST.
 * Disposable local/CI only — never bind publicly.
 */
import http from "node:http"

const AUTH = process.env.SEASON_SIM_AUTH_UPSTREAM ?? "http://127.0.0.1:9999"
const REST = process.env.SEASON_SIM_REST_UPSTREAM ?? "http://127.0.0.1:65433"
const PORT = Number(process.env.SEASON_SIM_GATEWAY_PORT ?? "54321")
const HOST = process.env.SEASON_SIM_GATEWAY_HOST ?? "127.0.0.1"

const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url || "/", `http://${HOST}:${PORT}`)
    let upstream
    let path = url.pathname + url.search
    if (path.startsWith("/auth/v1")) {
      upstream = AUTH
      path = path.slice("/auth/v1".length) || "/"
    } else if (path.startsWith("/rest/v1")) {
      upstream = REST
      path = path.slice("/rest/v1".length) || "/"
    } else if (path === "/health") {
      res.writeHead(200, { "content-type": "application/json" })
      res.end(JSON.stringify({ ok: true }))
      return
    } else {
      res.writeHead(404, { "content-type": "application/json" })
      res.end(JSON.stringify({ error: "not found" }))
      return
    }
    const headers = { ...req.headers, host: new URL(upstream).host }
    delete headers["content-length"]
    const chunks = []
    for await (const c of req) chunks.push(c)
    const body = Buffer.concat(chunks)
    const up = await fetch(`${upstream}${path}`, {
      method: req.method,
      headers,
      body: ["GET", "HEAD"].includes(req.method || "GET") ? undefined : body,
    })
    const buf = Buffer.from(await up.arrayBuffer())
    const out = {}
    up.headers.forEach((v, k) => {
      if (k !== "transfer-encoding") out[k] = v
    })
    out["access-control-allow-origin"] = req.headers.origin || "http://127.0.0.1:3010"
    out["access-control-allow-credentials"] = "true"
    out["access-control-allow-headers"] =
      "authorization,apikey,content-type,x-client-info,x-supabase-api-version"
    res.writeHead(up.status, out)
    res.end(buf)
  } catch (e) {
    res.writeHead(502, { "content-type": "application/json" })
    res.end(JSON.stringify({ error: String(e) }))
  }
})

server.listen(PORT, HOST, () => {
  console.log(`season-sim gateway ${HOST}:${PORT}`)
})
