import { resolve } from "path"
import { readFileSync } from "fs"
import { Terminal } from "lucide-react"
import { GuideShell } from "@/components/guides/guide-shell"
import { GuideMarkdown } from "@/components/guides/guide-markdown"

const guidePath = resolve(process.cwd(), "docs", "DISCORD-SLASH-COMMANDS-REFERENCE.md")

function getGuideContent(): string {
  try {
    return readFileSync(guidePath, "utf-8")
  } catch {
    return "# Discord Slash Commands\n\nGuide content could not be loaded. See **Settings → Guides** for links."
  }
}

export default function DiscordSlashCommandsGuidePage() {
  return (
    <GuideShell
      title="Discord Slash Commands"
      description="Quick reference for league bot commands coaches use in Discord."
      icon={Terminal}
    >
      <GuideMarkdown content={getGuideContent()} />
    </GuideShell>
  )
}
