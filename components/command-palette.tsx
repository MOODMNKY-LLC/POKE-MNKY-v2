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
import { Home, Settings, User, Users, Trophy } from "lucide-react"
import { openProfileSheet } from "@/components/profile/profile-sheet-trigger"
import { cn } from "@/lib/utils"

export function CommandPalette() {
  const [open, setOpen] = React.useState(false)
  const router = useRouter()

  React.useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault()
        setOpen((o) => !o)
      }
    }
    document.addEventListener("keydown", down)
    return () => document.removeEventListener("keydown", down)
  }, [])

  const run = React.useCallback(
    (cb: () => void) => {
      setOpen(false)
      cb()
    },
    []
  )

  return (
    <CommandDialog
      open={open}
      onOpenChange={setOpen}
      label="Command palette"
      contentClassName={cn(
        "overflow-hidden rounded-lg border bg-popover text-popover-foreground shadow-lg",
        "max-w-[calc(100vw-2rem)] sm:max-w-lg",
        "p-1 [&_[cmdk-input]]:border-b [&_[cmdk-input]]:mb-1"
      )}
      overlayClassName="bg-black/50"
    >
      <CommandInput placeholder="Search or run a command..." />
      <CommandList>
        <CommandEmpty>No results found.</CommandEmpty>
        <CommandGroup heading="Quick actions">
          <CommandItem
            value="profile"
            keywords={["open", "user", "account"]}
            onSelect={() => run(openProfileSheet)}
          >
            <User className="mr-2 h-4 w-4" />
            Open Profile
          </CommandItem>
        </CommandGroup>
        <CommandGroup heading="Navigation">
          <CommandItem
            value="dashboard"
            keywords={["home", "overview"]}
            onSelect={() => run(() => router.push("/dashboard"))}
          >
            <Home className="mr-2 h-4 w-4" />
            Dashboard
          </CommandItem>
          <CommandItem
            value="settings"
            keywords={["account", "preferences"]}
            onSelect={() => run(() => router.push("/dashboard/settings"))}
          >
            <Settings className="mr-2 h-4 w-4" />
            Settings
          </CommandItem>
          <CommandItem
            value="my teams"
            keywords={["showdown", "teams"]}
            onSelect={() => run(() => router.push("/dashboard/teams"))}
          >
            <Users className="mr-2 h-4 w-4" />
            My Teams
          </CommandItem>
          <CommandItem
            value="league team"
            keywords={["coach", "roster", "league"]}
            onSelect={() => run(() => router.push("/dashboard/league-team"))}
          >
            <Trophy className="mr-2 h-4 w-4" />
            My League Team
          </CommandItem>
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  )
}
