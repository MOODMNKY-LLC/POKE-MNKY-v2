"use client"

import { useState } from "react"
import { Plus, Trash2 } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import type {
  DraftPoolEntrySnapshot,
  DraftPoolRestrictionSnapshot,
} from "@/lib/draft-pool-builder/diff"

type RestrictionsPanelProps = {
  versionId?: string
  entries: DraftPoolEntrySnapshot[]
  restrictions: DraftPoolRestrictionSnapshot[]
  editable: boolean
  onAdd?: (restriction: Omit<DraftPoolRestrictionSnapshot, "id">) => Promise<void>
  onRemove?: (restriction: DraftPoolRestrictionSnapshot) => Promise<void>
}

export function RestrictionsPanel({
  versionId,
  entries,
  restrictions,
  editable,
  onAdd,
  onRemove,
}: RestrictionsPanelProps) {
  const [kind, setKind] = useState<"move" | "ability" | "combo">("move")
  const [subject, setSubject] = useState("")
  const [name, setName] = useState("")
  const [note, setNote] = useState("")

  async function addRestriction() {
    if (!onAdd || !versionId || !name.trim()) return
    const entry = entries.find((candidate) => candidate.id === subject)
    if (kind !== "combo" && !entry) return
    await onAdd({
      version_id: versionId,
      pokemon_id: kind === "combo" && !entry ? null : entry?.pokemon_id ?? null,
      sheet_name: kind === "combo" && !entry ? null : entry?.sheet_name ?? null,
      kind,
      name: name.trim(),
      note: note.trim() || null,
    })
    setName("")
    setNote("")
  }

  return (
    <div className="flex flex-col gap-4">
      {editable ? (
        <Card>
          <CardHeader><CardTitle className="text-base">Add restriction</CardTitle></CardHeader>
          <CardContent className="flex flex-col gap-4">
            <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
              <div className="flex flex-col gap-2">
                <Label htmlFor="restriction-kind">Kind</Label>
                <Select value={kind} onValueChange={(value: "move" | "ability" | "combo") => setKind(value)}>
                  <SelectTrigger id="restriction-kind" className="min-h-11 w-full"><SelectValue /></SelectTrigger>
                  <SelectContent><SelectGroup>
                    <SelectItem value="move">Move</SelectItem>
                    <SelectItem value="ability">Ability</SelectItem>
                    <SelectItem value="combo">Combo</SelectItem>
                  </SelectGroup></SelectContent>
                </Select>
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="restriction-subject">Applies to</Label>
                <Select value={subject || (kind === "combo" ? "global" : undefined)} onValueChange={(value) => { setSubject(value === "global" ? "" : value); if (value === "global") setKind("combo") }}>
                  <SelectTrigger id="restriction-subject" className="min-h-11 w-full"><SelectValue placeholder="Select Pokémon" /></SelectTrigger>
                  <SelectContent><SelectGroup>
                    {kind === "combo" ? <SelectItem value="global">Global combo</SelectItem> : null}
                    {entries.map((entry) => <SelectItem key={entry.id} value={entry.id}>{entry.sheet_name}</SelectItem>)}
                  </SelectGroup></SelectContent>
                </Select>
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="restriction-name">Name</Label>
                <Input id="restriction-name" value={name} onChange={(event) => setName(event.target.value)} placeholder={kind === "move" ? "Move name" : kind === "ability" ? "Ability name" : "Combo name"} className="min-h-11" />
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="restriction-note">Note</Label>
                <Input id="restriction-note" value={note} onChange={(event) => setNote(event.target.value)} placeholder="Optional context" className="min-h-11" />
              </div>
            </div>
            <Button className="min-h-11 md:self-end" onClick={() => void addRestriction()} disabled={!name.trim() || (kind !== "combo" && !subject)}>
              <Plus data-icon="inline-start" />
              Add restriction
            </Button>
          </CardContent>
        </Card>
      ) : null}

      {restrictions.length === 0 ? (
        <Card><CardContent className="py-8 text-center text-sm text-muted-foreground">No restrictions in this version.</CardContent></Card>
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {restrictions.map((restriction) => (
            <Card key={restriction.id}>
              <CardHeader className="flex-row items-start justify-between gap-3">
                <div className="flex flex-col gap-2">
                  <CardTitle className="text-base">{restriction.name}</CardTitle>
                  <div className="flex flex-wrap gap-2">
                    <Badge variant="secondary">{restriction.kind}</Badge>
                    <Badge variant="outline">{restriction.sheet_name ?? "Global"}</Badge>
                  </div>
                </div>
                {editable ? (
                  <Button variant="ghost" size="icon" className="size-11" aria-label={`Remove ${restriction.name}`} onClick={() => void onRemove?.(restriction)}>
                    <Trash2 />
                  </Button>
                ) : null}
              </CardHeader>
              {restriction.note ? <CardContent><p className="text-sm text-muted-foreground">{restriction.note}</p></CardContent> : null}
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
