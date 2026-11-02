"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "cmdk"
import { Globe } from "lucide-react"
import { openProfileSheet } from "@/components/profile/profile-sheet-trigger"
import { cn } from "@/lib/utils"
import {
  LEAGUE_SITE_LINKS,
  getPaletteEntries,
  type CoachNavContext,
  type PaletteEntry,
} from "@/lib/nav/coach-nav"

export const OPEN_COMMAND_PALETTE_EVENT = "open-command-palette"

const ITEM_CLASS =
  "flex min-h-11 cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-sm aria-selected:bg-accent aria-selected:text-accent-foreground md:min-h-9"
const HEADING_CLASS =
  "[&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1.5 [&_[cmdk-group-heading]]:text-xs [&_[cmdk-group-heading]]:font-medium [&_[cmdk-group-heading]]:text-muted-foreground"

export function CommandPalette({ ctx }: { ctx: CoachNavContext }) {
  const [open, setOpen] = React.useState(false)
  const router = useRouter()

  React.useEffect(() => {
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
  }, [])

  const run = React.useCallback((cb: () => void) => {
    setOpen(false)
    cb()
  }, [])

  const sections = React.useMemo(() => {
    const byGroup = new Map<string, PaletteEntry[]>()
    for (const entry of getPaletteEntries(ctx)) {
      const list = byGroup.get(entry.groupLabel) ?? []
      list.push(entry)
      byGroup.set(entry.groupLabel, list)
    }
    return Array.from(byGroup.entries())
  }, [ctx])

  return (
    <CommandDialog
      open={open}
      onOpenChange={setOpen}
      label="Command palette"
      contentClassName={cn(
        "overflow-hidden rounded-lg border bg-popover text-popover-foreground shadow-lg",
        "max-w-[calc(100vw-2rem)] sm:max-w-lg",
        "p-1 [&_[cmdk-input]]:border-b [&_[cmdk-input]]:mb-1",
      )}
      overlayClassName="bg-black/50"
    >
      <CommandInput placeholder="Search pages and actions..." className="h-11 w-full bg-transparent px-2 text-sm outline-none" />
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
                    run(() => (entry.action === "open-profile-sheet" ? openProfileSheet() : router.push(entry.href)))
                  }
                >
                  <Icon className="size-4" aria-hidden="true" />
                  {entry.title}
                </CommandItem>
              )
            })}
          </CommandGroup>
        ))}
        <CommandGroup heading="League site" className={HEADING_CLASS}>
          {LEAGUE_SITE_LINKS.map((link) => (
            <CommandItem
              key={link.href}
              value={`League site ${link.title}`}
              className={ITEM_CLASS}
              onSelect={() => run(() => router.push(link.href))}
            >
              <Globe className="size-4" aria-hidden="true" />
              {link.title}
            </CommandItem>
          ))}
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  )
}
