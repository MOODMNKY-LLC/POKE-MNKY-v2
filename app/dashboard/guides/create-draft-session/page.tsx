import { resolve } from "path"
import { readFileSync } from "fs"
import Link from "next/link"
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbLink,
} from "@/components/ui/breadcrumb"
import { SidebarTrigger } from "@/components/ui/sidebar"
import { Separator } from "@/components/ui/separator"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import ReactMarkdown from "react-markdown"
import { ClipboardList } from "lucide-react"

const guidePath = resolve(process.cwd(), "docs", "CREATE-DRAFT-SESSION-GUIDE.md")

function getGuideContent(): string {
  try {
    return readFileSync(guidePath, "utf-8")
  } catch {
    return "# Create Draft Session Guide\n\nGuide content could not be loaded. See **Settings → Guides** for links and **docs/CREATE-DRAFT-SESSION-GUIDE.md** in the project."
  }
}

export default function CreateDraftSessionGuidePage() {
  const content = getGuideContent()

  return (
    <>
      <header className="flex h-16 shrink-0 items-center gap-2 border-b px-4">
        <SidebarTrigger className="-ml-1" />
        <Separator orientation="vertical" className="mr-2 h-4" />
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink asChild>
                <Link href="/dashboard">Dashboard</Link>
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbItem>
              <BreadcrumbLink asChild>
                <Link href="/dashboard/settings?tab=guides">Guides</Link>
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbItem>
              <BreadcrumbPage>Create Draft Session</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
      </header>
      <div className="flex flex-1 flex-col gap-4 p-4 max-w-3xl">
        <div className="flex items-center gap-2">
          <ClipboardList className="h-6 w-6 text-muted-foreground" />
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Create Draft Session Guide</h1>
            <p className="text-muted-foreground text-sm">
              How to configure and create a draft session with rules, playoffs, and draft pool
            </p>
          </div>
        </div>
        <Card>
          <CardHeader>
            <CardTitle className="sr-only">Guide content</CardTitle>
            <CardDescription className="sr-only">
              Full guide for creating draft sessions
            </CardDescription>
          </CardHeader>
          <CardContent className="prose prose-sm dark:prose-invert max-w-none prose-headings:font-semibold prose-a:text-primary prose-a:underline">
            <ReactMarkdown
              components={{
                a: ({ href, children, ...props }) => {
                  if (href?.startsWith("/")) {
                    return (
                      <Link href={href} {...props}>
                        {children}
                      </Link>
                    )
                  }
                  return (
                    <a href={href} target="_blank" rel="noopener noreferrer" {...props}>
                      {children}
                    </a>
                  )
                },
              }}
            >
              {content}
            </ReactMarkdown>
          </CardContent>
        </Card>
        <p className="text-sm text-muted-foreground">
          <Link href="/dashboard/settings?tab=guides" className="text-primary hover:underline">
            ← Back to Settings → Guides and References
          </Link>
        </p>
      </div>
    </>
  )
}
