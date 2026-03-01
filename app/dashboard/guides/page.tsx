import Link from "next/link"
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbList,
  BreadcrumbLink,
  BreadcrumbPage,
} from "@/components/ui/breadcrumb"
import { SidebarTrigger } from "@/components/ui/sidebar"
import { Separator } from "@/components/ui/separator"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { BookOpen, UserPlus, Hammer } from "lucide-react"

const GUIDES = [
  {
    slug: "coach-and-team-builder",
    title: "Register as a coach and use the Team Builder",
    description:
      "Step-by-step walkthrough: how to become a coach in the league and how to build and manage teams in the Team Builder.",
    icon: UserPlus,
    href: "/dashboard/guides/coach-and-team-builder",
  },
] as const

export default function GuidesPage() {
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
              <BreadcrumbPage>Guides</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
      </header>
      <div className="flex-1 space-y-6 p-4 md:p-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Guides</h1>
          <p className="text-muted-foreground">
            Walkthroughs and how-tos for the player dashboard and league features.
          </p>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          {GUIDES.map((g) => (
            <Link key={g.slug} href={g.href}>
              <Card className="h-full transition-colors hover:bg-muted/50">
                <CardHeader className="flex flex-row items-start gap-3">
                  <div className="rounded-lg bg-primary/10 p-2">
                    <g.icon className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <CardTitle className="text-base">{g.title}</CardTitle>
                    <CardDescription>{g.description}</CardDescription>
                  </div>
                </CardHeader>
              </Card>
            </Link>
          ))}
        </div>
      </div>
    </>
  )
}
