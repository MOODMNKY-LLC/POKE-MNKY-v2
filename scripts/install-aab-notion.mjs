import { cpSync, existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"

const root = join(dirname(fileURLToPath(import.meta.url)), "..")
const source = join(root, "agents", "aab-notion")
const dest = process.argv[2]
const tomlPath = process.argv[3]
const files = ["catalog.mjs", "notion.mjs", "protocol.mjs", "retrieve.mjs", "answer.mjs", "server.mjs"]

if (!dest || !tomlPath) {
  console.error("usage: node scripts/install-aab-notion.mjs <dest-dir> <config.toml>")
  process.exit(1)
}

mkdirSync(dest, { recursive: true })
for (const file of files) cpSync(join(source, file), join(dest, file))

const serverPath = join(dest, "server.mjs").replaceAll("\\", "/")
let text = existsSync(tomlPath) ? readFileSync(tomlPath, "utf8") : ""
if (!text.includes("[mcp_servers.aab-notion]")) {
  text += [
    "",
    "[mcp_servers.aab-notion]",
    'command = "node"',
    `args = ["${serverPath}"]`,
    "",
    "[mcp_servers.aab-notion.env]",
    'AAB_NOTION_ROLE = "maus"',
    'AAB_NOTION_TOKEN_FILE = "/data/.openmausbot/secrets/notion-maus-ro"',
    'AAB_FIXTURE_FILE = "/data/.openmausbot/fixture-canary.txt"',
    "",
  ].join("\n")
  writeFileSync(tomlPath, text)
  console.log("toml_added")
} else {
  console.log("toml_kept")
}
console.log("installed")
