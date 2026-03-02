import { NextResponse } from "next/server"
import { readFileSync } from "fs"
import { resolve } from "path"

const guidePath = resolve(process.cwd(), "docs", "LEAGUE-SIMULATION-AND-TESTING-GUIDE.md")

function getGuideContent(): string {
  try {
    return readFileSync(guidePath, "utf-8")
  } catch {
    return "# League Simulation & Testing Guide\n\nGuide content could not be loaded. See **docs/LEAGUE-SIMULATION-AND-TESTING-GUIDE.md** in the project and **Admin → Simulation** for the control panel."
  }
}

export async function GET() {
  const content = getGuideContent()
  return NextResponse.json({ content })
}
