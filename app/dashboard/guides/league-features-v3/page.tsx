import { resolve } from "path"
import { readFileSync } from "fs"
import { BookOpen } from "lucide-react"
import { GuideShell } from "@/components/guides/guide-shell"
import { GuideMarkdown } from "@/components/guides/guide-markdown"

const guidePath = resolve(process.cwd(), "docs", "LEAGUE-FEATURES-GUIDE-V3.md")

function getGuideContent(): string {
  try {
    return readFileSync(guidePath, "utf-8")
  } catch {
    return "# League Features\n\nGuide content could not be loaded. See **Settings → Guides** for links."
  }
}

export default function LeagueFeaturesV3GuidePage() {
  return (
    <GuideShell
      title="League Features"
      description="How coaches use the dashboard for draft, roster, matches, and Showdown tools."
      icon={BookOpen}
    >
      <GuideMarkdown content={getGuideContent()} />
    </GuideShell>
  )
}
