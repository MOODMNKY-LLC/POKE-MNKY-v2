import { resolve } from "path"
import { readFileSync } from "fs"
import { ClipboardList } from "lucide-react"
import { GuideShell } from "@/components/guides/guide-shell"
import { GuideMarkdown } from "@/components/guides/guide-markdown"

const guidePath = resolve(process.cwd(), "docs", "CREATE-DRAFT-SESSION-GUIDE.md")

function getGuideContent(): string {
  try {
    return readFileSync(guidePath, "utf-8")
  } catch {
    return "# Create a Draft Session\n\nGuide content could not be loaded. See **Settings → Guides** for links."
  }
}

export default function CreateDraftSessionGuidePage() {
  return (
    <GuideShell
      title="Create a Draft Session"
      description="Admin workflow for opening a draft session. Most coaches can skip this unless you help run the draft."
      icon={ClipboardList}
    >
      <GuideMarkdown content={getGuideContent()} />
    </GuideShell>
  )
}
