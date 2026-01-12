import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import type { ReactNode } from "react"

interface FeatureCardProps {
  icon: ReactNode
  title: string
  description: string
  status?: "live" | "beta" | "coming-soon"
  href?: string
}

export function FeatureCard({ icon, title, description, status = "live", href }: FeatureCardProps) {
  const Wrapper = href ? "a" : "div"
  const wrapperProps = href ? { href } : {}

  return (
    <Wrapper {...wrapperProps}>
      <Card className="group relative overflow-hidden transition-all hover:border-primary/50 hover:shadow-lg hover:shadow-primary/10">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-secondary/5 opacity-0 group-hover:opacity-100 transition-opacity" />
        <CardHeader>
          <div className="flex items-start justify-between">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-all">
              {icon}
            </div>
            {status !== "live" && (
              <Badge variant={status === "beta" ? "secondary" : "outline"} className="text-xs">
                {status === "beta" ? "Beta" : "Soon"}
              </Badge>
            )}
          </div>
          <CardTitle className="mt-4 text-balance">{title}</CardTitle>
          <CardDescription className="text-balance">{description}</CardDescription>
        </CardHeader>
      </Card>
    </Wrapper>
  )
}
