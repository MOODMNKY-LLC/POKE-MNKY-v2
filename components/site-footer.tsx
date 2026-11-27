import Link from "next/link"
import { Github } from "lucide-react"
import { Button } from "@/components/ui/button"
import { homepageLeague } from "@/lib/homepage-config"
import { PUBLIC_FOOTER_GROUPS } from "@/lib/nav/public-nav"

export function SiteFooter() {
  return (
    <footer
      className="w-full border-t border-border/40 bg-muted/20 pt-8 pr-[env(safe-area-inset-right)] pb-[calc(2rem+var(--assistant-clearance,0px)+env(safe-area-inset-bottom))] pl-[env(safe-area-inset-left)] md:pt-12 md:pb-[calc(3rem+var(--assistant-clearance,0px)+env(safe-area-inset-bottom))]"
      data-testid="site-footer"
    >
      <div className="container mx-auto max-w-7xl px-4 md:px-6">
        <div className="grid justify-items-start gap-8 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 md:justify-items-center">
          {PUBLIC_FOOTER_GROUPS.map((group) => (
            <div key={group.id} className="w-full space-y-3 sm:w-auto">
              <h3 className="font-semibold">{group.label}</h3>
              <ul className="space-y-2 text-sm">
                {group.items.map((item) => {
                  if ("plain" in item && item.plain) {
                    return (
                      <li key={item.title}>
                        <span className="text-muted-foreground">{item.title}</span>
                      </li>
                    )
                  }
                  if (!("href" in item)) {
                    return null
                  }
                  if ("external" in item && item.external) {
                    return (
                      <li key={item.href}>
                        <a
                          href={item.href}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-muted-foreground transition-colors hover:text-primary"
                        >
                          {item.title}
                        </a>
                      </li>
                    )
                  }
                  return (
                    <li key={item.href}>
                      <Link
                        href={item.href}
                        className="text-muted-foreground transition-colors hover:text-primary"
                      >
                        {item.title}
                      </Link>
                    </li>
                  )
                })}
              </ul>
            </div>
          ))}
        </div>
        <div className="mt-8 border-t border-border/40 pt-8">
          <div className="mx-auto flex max-w-4xl flex-col items-center justify-center gap-4 text-center">
            <p className="text-sm text-muted-foreground">
              &copy; {new Date().getFullYear()} {homepageLeague.fullName}. Built by{" "}
              <Link
                href="https://moodmnky.com"
                target="_blank"
                rel="noopener noreferrer"
                className="font-semibold text-foreground transition-colors hover:text-primary"
              >
                MOODMNKY LLC
              </Link>
              .
            </p>
            <Button asChild variant="outline" size="sm" className="flex items-center gap-2">
              <Link
                href="https://github.com/MOODMNKY-LLC/POKE-MNKY-v2"
                target="_blank"
                rel="noopener noreferrer"
              >
                <Github className="h-4 w-4" aria-hidden="true" />
                View on GitHub
              </Link>
            </Button>
          </div>
        </div>
      </div>
    </footer>
  )
}
