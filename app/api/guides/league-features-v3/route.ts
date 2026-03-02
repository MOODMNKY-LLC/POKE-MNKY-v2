import { NextResponse } from "next/server"
import { readFileSync } from "fs"
import { resolve } from "path"

const guidePath = resolve(process.cwd(), "docs", "LEAGUE-FEATURES-GUIDE-V3.md")

function getGuideContent(): string {
  try {
    let content = readFileSync(guidePath, "utf-8")
    const refsHeading = "## 10. References (Docs and Reports)"
    if (content.includes(refsHeading)) {
      const before = content.slice(0, content.indexOf(refsHeading))
      const inAppRefs =
        "## 10. References (Docs and Reports)\n\nIn the app, go to **Settings → Guides** for the Dashboard guide and a full **References** list. The project repo also contains DISCORD-SERVER-INTEGRATION-REPORT.md, DISCORD-SERVER-MAP.md, and CHATGPT-V3-UPDATE.md in the docs folder."
      content = before + inAppRefs
    }
    return content
  } catch {
    return "# League Features Guide (v3)\n\nGuide content could not be loaded. See **Settings → Guides** for links."
  }
}

export async function GET() {
  const content = getGuideContent()
  return NextResponse.json({ content })
}
