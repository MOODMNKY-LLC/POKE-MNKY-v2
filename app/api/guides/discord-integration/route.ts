import { NextResponse } from "next/server"
import { readFileSync } from "fs"
import { resolve } from "path"

const guidePath = resolve(process.cwd(), "docs", "DISCORD-INTEGRATION-GUIDE.md")

function getGuideContent(): string {
  try {
    return readFileSync(guidePath, "utf-8")
  } catch {
    return "# Discord Integration Guide\n\nGuide content could not be loaded. See **Settings → Guides** for links and **docs/DISCORD-INTEGRATION-GUIDE.md** in the project."
  }
}

export async function GET() {
  const content = getGuideContent()
  return NextResponse.json({ content })
}
