import { resolve } from "path"
import { readFileSync } from "fs"
import { FlaskConical } from "lucide-react"
import { GuideShell } from "@/components/guides/guide-shell"
import { GuideMarkdown } from "@/components/guides/guide-markdown"

const guidePath = resolve(process.cwd(), "docs", "LEAGUE-SIMULATION-AND-TESTING-GUIDE.md")

function getGuideContent(): string {
  try {
    return readFileSync(guidePath, "utf-8")
  } catch {
    return "# League Simulation\n\nGuide content could not be loaded. See **Settings → Guides** for links."
  }
}

export default function LeagueSimulationGuidePage() {
  return (
    <GuideShell
      title="League Simulation"
      description="Admin and ops guide for practice seasons and testing. Not required for weekly coaching."
      icon={FlaskConical}
    >
      <GuideMarkdown content={getGuideContent()} />
    </GuideShell>
  )
}