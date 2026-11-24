import { writeSync } from "node:fs"
import { createHandler, loadToken } from "./protocol.mjs"

const role = process.env.AAB_NOTION_ROLE === "maus" ? "maus" : "claw"
const token = loadToken(process.env.AAB_NOTION_TOKEN_FILE)
const handle = createHandler({ role, token })
let buffer = Buffer.alloc(0)
let lineMode = false

process.stdin.on("data", (chunk) => {
  buffer = Buffer.concat([buffer, chunk])
  drain()
})

function drain() {
  while (buffer.length) {
    if (buffer[0] === 0x7b || buffer[0] === 0x0a) {
      const newline = buffer.indexOf(0x0a)
      if (newline === -1) return
      const line = buffer.slice(0, newline).toString("utf8").trim()
      buffer = buffer.slice(newline + 1)
      if (line) {
        lineMode = true
        accept(line)
      }
      continue
    }
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
    accept(buffer.slice(start, start + length).toString("utf8"))
    buffer = buffer.slice(start + length)
  }
}

function accept(raw) {
  let message
  try {
    message = JSON.parse(raw)
  } catch {
    return
  }
  handle(message).then((response) => {
    if (response) write(response)
  })
}

function write(message) {
  const body = Buffer.from(JSON.stringify(message))
  if (lineMode) {
    writeSync(1, body)
    writeSync(1, "\n")
    return
  }
  writeSync(1, `Content-Length: ${body.length}\r\n\r\n`)
  writeSync(1, body)
}
