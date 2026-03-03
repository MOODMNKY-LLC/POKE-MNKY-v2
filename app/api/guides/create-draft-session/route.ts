import { NextResponse } from "next/server"
import { readFileSync } from "fs"
import { resolve } from "path"

const guidePath = resolve(process.cwd(), "docs", "CREATE-DRAFT-SESSION-GUIDE.md")

function getGuideContent(): string {
  try {
    return readFileSync(guidePath, "utf-8")
  } catch {
    return "# Create Draft Session Guide\n\nGuide content could not be loaded. See **docs/CREATE-DRAFT-SESSION-GUIDE.md** in the project and **Admin → Draft Sessions** for the Create Session wizard."
  }
}

export async function GET() {
  const content = getGuideContent()
  return NextResponse.json({ content })
}
