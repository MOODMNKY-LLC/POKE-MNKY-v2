import { NextResponse } from "next/server"
import { readFileSync } from "fs"
import { resolve } from "path"

const guidePath = resolve(process.cwd(), "docs", "DISCORD-SLASH-COMMANDS-REFERENCE.md")

function getGuideContent(): string {
  try {
    return readFileSync(guidePath, "utf-8")
  } catch {
    return "# Discord Slash Commands Reference\n\nGuide content could not be loaded. See **docs/DISCORD-SLASH-COMMANDS-REFERENCE.md** in the project."
  }
}

export async function GET() {
  const content = getGuideContent()
  return NextResponse.json({ content })
}
