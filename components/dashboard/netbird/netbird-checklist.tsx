"use client"

import { useState } from "react"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

const CHECKLIST_ITEMS = [
  { id: "invite", label: "Accepted my invite and set a password" },
  { id: "mfa", label: "Set up MFA in my authenticator app" },
  { id: "install", label: "Installed NetBird" },
  { id: "server", label: "Pointed the app at the league server and signed in" },
  { id: "verify", label: "Confirmed the app shows Connected" },
] as const

type ChecklistId = (typeof CHECKLIST_ITEMS)[number]["id"]

export function NetbirdChecklist() {
  const [done, setDone] = useState<ReadonlySet<ChecklistId>>(new Set())

  function toggle(id: ChecklistId) {
    setDone((prev) => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between gap-2">
          <CardTitle>Your progress</CardTitle>
          <Badge variant="secondary">
            {done.size} of {CHECKLIST_ITEMS.length}
          </Badge>
        </div>
        <CardDescription>A quick checklist for this visit. It is not saved when you leave the page.</CardDescription>
      </CardHeader>
      <CardContent>
        <ul className="space-y-2">
          {CHECKLIST_ITEMS.map((item) => (
            <li key={item.id}>
              <label className="flex cursor-pointer items-center gap-3 text-sm">
                <input
                  type="checkbox"
                  className="h-4 w-4 accent-primary"
                  checked={done.has(item.id)}
                  onChange={() => toggle(item.id)}
                />
                <span className={done.has(item.id) ? "text-muted-foreground line-through" : undefined}>
                  {item.label}
                </span>
              </label>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  )
}
