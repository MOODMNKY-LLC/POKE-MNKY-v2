import { createHandler, loadToken } from "./protocol.mjs"

const role = process.env.AAB_NOTION_ROLE === "maus" ? "maus" : "claw"
const token = loadToken(process.env.AAB_NOTION_TOKEN_FILE)
const handle = createHandler({ role, token })
let buffer = Buffer.alloc(0)

process.stdin.on("data", (chunk) => {
  buffer = Buffer.concat([buffer, chunk])
  while (true) {
    const headerEnd = buffer.indexOf("\r\n\r\n")
    if (headerEnd === -1) return
    const header = buffer.slice(0, headerEnd).toString("utf8")
    const match = header.match(/Content-Length:\s*(\d+)/i)
    if (!match) {
      buffer = buffer.slice(headerEnd + 4)
      continue
    }
    const length = Number(match[1])
    const start = headerEnd + 4
    if (buffer.length < start + length) return
    const raw = buffer.slice(start, start + length).toString("utf8")
    buffer = buffer.slice(start + length)
    let message
    try {
      message = JSON.parse(raw)
    } catch {
      continue
    }
    handle(message).then((response) => {
      if (response) write(response)
    })
  }
})

function write(message) {
  const body = Buffer.from(JSON.stringify(message))
  process.stdout.write(`Content-Length: ${body.length}\r\n\r\n`)
  process.stdout.write(body)
}
