import { resolve } from "path"
import { readFileSync } from "fs"
import { MessageCircle } from "lucide-react"
import { GuideShell } from "@/components/guides/guide-shell"
import { GuideMarkdown } from "@/components/guides/guide-markdown"

const guidePath = resolve(process.cwd(), "docs", "DISCORD-INTEGRATION-GUIDE.md")

function getGuideContent(): string {
  try {
    return readFileSync(guidePath, "utf-8")
  } catch {
    return "# Discord Integration Guide\n\nGuide content could not be loaded. See **Settings → Guides** for links."
  }
}

export default function DiscordIntegrationGuidePage() {
  return (
    <GuideShell
      title="Discord Integration"
      description="Webhooks, bot commands, channel mapping, and how the league Discord server connects to the app."
      icon={MessageCircle}
    >
      <GuideMarkdown content={getGuideContent()} />
    </GuideShell>
  )
}
