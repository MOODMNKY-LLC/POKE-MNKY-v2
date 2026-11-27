"use client"

import * as React from "react"
import { usePathname, useRouter } from "next/navigation"
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "cmdk"
import { LayoutDashboard } from "lucide-react"
import { cn } from "@/lib/utils"
import { getPublicPaletteEntries } from "@/lib/nav/public-nav"
import { OPEN_COMMAND_PALETTE_EVENT } from "@/components/command-palette"

const ITEM_CLASS =
  "flex min-h-11 cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-sm aria-selected:bg-accent aria-selected:text-accent-foreground md:min-h-9"
const HEADING_CLASS =
  "[&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1.5 [&_[cmdk-group-heading]]:text-xs [&_[cmdk-group-heading]]:font-medium [&_[cmdk-group-heading]]:text-muted-foreground"

const ADMIN_SHORTCUTS = [
  { id: "admin-home", title: "Admin overview", href: "/admin" },
  { id: "admin-netbird", title: "NetBird requests", href: "/admin/netbird-requests" },
  { id: "admin-coach-apps", title: "Coach applications", href: "/admin/coach-applications" },
  { id: "admin-trades", title: "Trades", href: "/admin/trades" },
  { id: "admin-sheet-sync", title: "Sheet sync", href: "/admin/sheet-sync" },
] as const

/**
 * Command palette for public and admin shells (⌘K / Ctrl-K).
 * Skips /dashboard so the coach CommandPalette keeps sole ownership there.
 */
export function PublicCommandPalette() {
  const [open, setOpen] = React.useState(false)
  const pathname = usePathname()
  const router = useRouter()
  const onDashboard = pathname?.startsWith("/dashboard")

  React.useEffect(() => {
    if (onDashboard) return

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault()
        setOpen((o) => !o)
      }
    }
    const onOpen = () => setOpen(true)
    document.addEventListener("keydown", onKeyDown)
    window.addEventListener(OPEN_COMMAND_PALETTE_EVENT, onOpen)
    return () => {
      document.removeEventListener("keydown", onKeyDown)
      window.removeEventListener(OPEN_COMMAND_PALETTE_EVENT, onOpen)
    }
  }, [onDashboard])

  const run = React.useCallback((cb: () => void) => {
    setOpen(false)
    cb()
  }, [])

  const sections = React.useMemo(() => {
    const byGroup = new Map<string, ReturnType<typeof getPublicPaletteEntries>>()
    for (const entry of getPublicPaletteEntries()) {
      const list = byGroup.get(entry.groupLabel) ?? []
      list.push(entry)
      byGroup.set(entry.groupLabel, list)
    }
    return Array.from(byGroup.entries())
  }, [])

  if (onDashboard) return null

  return (
    <CommandDialog
      open={open}
      onOpenChange={setOpen}
      label="Search pages"
      contentClassName={cn(
        "overflow-hidden rounded-lg border bg-popover text-popover-foreground shadow-lg",
        "max-w-[calc(100vw-2rem)] sm:max-w-lg",
        "p-1 [&_[cmdk-input]]:border-b [&_[cmdk-input]]:mb-1",
      )}
      overlayClassName="bg-black/50"
    >
      <CommandInput placeholder="Search pages..." className="h-11 w-full bg-transparent px-2 text-sm outline-none" />
      <CommandList className="max-h-[60svh] overflow-y-auto">
        <CommandEmpty className="py-6 text-center text-sm text-muted-foreground">No results found.</CommandEmpty>
        {sections.map(([heading, entries]) => (
          <CommandGroup key={heading} heading={heading} className={HEADING_CLASS}>
            {entries.map((entry) => {
              const Icon = entry.icon
              return (
                <CommandItem
                  key={entry.id}
                  value={`${entry.groupLabel} ${entry.title}`}
                  keywords={entry.keywords}
                  className={ITEM_CLASS}
                  onSelect={() =>
                    run(() => {
                      if (entry.external) {
                        window.open(entry.href, "_blank", "noopener,noreferrer")
                      } else {
                        router.push(entry.href)
                      }
                    })
                  }
                >
                  <Icon className="size-4" aria-hidden="true" />
                  {entry.title}
                </CommandItem>
              )
            })}
          </CommandGroup>
        ))}
        <CommandGroup heading="Admin" className={HEADING_CLASS}>
          {ADMIN_SHORTCUTS.map((item) => (
            <CommandItem
              key={item.id}
              value={`Admin ${item.title}`}
              className={ITEM_CLASS}
              onSelect={() => run(() => router.push(item.href))}
            >
              <LayoutDashboard className="size-4" aria-hidden="true" />
              {item.title}
            </CommandItem>
          ))}
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  )
}
