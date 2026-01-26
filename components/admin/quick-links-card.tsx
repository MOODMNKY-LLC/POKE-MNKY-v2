"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { LucideIcon } from "lucide-react"
import Link from "next/link"

interface QuickLink {
  href: string
  label: string
  icon: LucideIcon
}

interface QuickLinksCardProps {
  title?: string
  description?: string
  links: QuickLink[]
  className?: string
}

export function QuickLinksCard({
  title = "Quick Links",
  description = "Access related features",
  links,
  className,
}: QuickLinksCardProps) {
  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        {description && <CardDescription>{description}</CardDescription>}
      </CardHeader>
      <CardContent className="space-y-2">
        {links.map((link) => {
          const Icon = link.icon
          return (
            <Button key={link.href} asChild variant="outline" className="w-full justify-start">
              <Link href={link.href}>
                <Icon className="h-4 w-4 mr-2" />
                {link.label}
              </Link>
            </Button>
          )
        })}
      </CardContent>
    </Card>
  )
}
