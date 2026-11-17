"use client"

import { useMemo, useState } from "react"
import Link from "next/link"
import useSWR from "swr"
import { CheckCircle2, CircleAlert, GitCompareArrows, Loader2, Send, ShieldCheck, Trash2, Undo2 } from "lucide-react"
import { toast } from "sonner"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { EntryList } from "@/components/admin/draft-pool-editor/entry-list"
import { RestrictionsPanel } from "@/components/admin/draft-pool-editor/restrictions-panel"
import { draftPoolAccessView } from "@/lib/draft-pool-builder/access-view"
import { diffDraftPoolVersions, type DraftPoolRestrictionSnapshot } from "@/lib/draft-pool-builder/diff"
import {
  addDraftPoolEntry,
  addDraftPoolRestriction,
  discardDraftPoolRevision,
  DRAFT_POOL_EDITOR_ACCESS_KEY,
  DRAFT_POOL_EDITOR_SEASONS_KEY,
  draftPoolEditorAccessFetcher,
  draftPoolSeasonsFetcher,
  loadDraftPoolEditorSnapshot,
  publishDraftPoolRevision,
  removeDraftPoolEntry,
  removeDraftPoolRestriction,
  startDraftPoolRevision,
  submitDraftPoolRevision,
  updateDraftPoolEntry,
  withdrawDraftPoolRevision,
  type DraftPoolEditorSnapshot,
} from "@/lib/draft-pool-builder/editor-client"

function displayActor(id: string | null) {
  return id ? id.slice(0, 8) : "Unknown"
}

function displayDate(value: string | null) {
  return value ? new Date(value).toLocaleString() : "Not yet"
}

function ChangesPanel({ snapshot }: { snapshot: DraftPoolEditorSnapshot }) {
  const diff = useMemo(
    () => diffDraftPoolVersions(
      snapshot.publishedEntries,
      snapshot.pendingEntries,
      snapshot.publishedRestrictions,
      snapshot.pendingRestrictions,
    ),
    [snapshot],
  )
  if (!snapshot.pending) {
    return <Card><CardContent className="py-8 text-center text-sm text-muted-foreground">Start a revision to compare it with the published pool.</CardContent></Card>
  }
  const total = diff.entries.added.length + diff.entries.removed.length + diff.entries.changed.length + diff.restrictions.added.length + diff.restrictions.removed.length + diff.restrictions.changed.length
  if (total === 0) {
    return <Card><CardContent className="py-8 text-center text-sm text-muted-foreground">This revision matches the published pool.</CardContent></Card>
  }
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Card>
        <CardHeader><CardTitle>Pool changes</CardTitle><CardDescription>Added, removed, and modified entries.</CardDescription></CardHeader>
        <CardContent className="flex flex-col gap-4">
          {diff.entries.added.map((entry) => <div key={`add-${entry.id}`} className="flex items-center justify-between gap-3"><span>{entry.sheet_name}</span><Badge>Added</Badge></div>)}
          {diff.entries.removed.map((entry) => <div key={`remove-${entry.id}`} className="flex items-center justify-between gap-3"><span>{entry.sheet_name}</span><Badge variant="destructive">Removed</Badge></div>)}
          {diff.entries.changed.map(({ before, after, changed }) => (
            <div key={`change-${after.id}`} className="flex flex-col gap-2 rounded-md border p-3">
              <div className="flex items-center justify-between gap-3"><span className="font-medium">{after.sheet_name}</span><Badge variant="secondary">Changed</Badge></div>
              <p className="text-sm text-muted-foreground">
                {changed.includes("points") ? `Points ${before.points} → ${after.points}. ` : ""}
                {changed.includes("status") ? `Status ${before.status} → ${after.status}. ` : ""}
                {changed.includes("tera") ? `Tera list ${before.tera_banned ? "on" : "off"} → ${after.tera_banned ? "on" : "off"}.` : ""}
              </p>
            </div>
          ))}
        </CardContent>
      </Card>
      <Card>
        <CardHeader><CardTitle>Restriction changes</CardTitle><CardDescription>Rules added, removed, or given a new note.</CardDescription></CardHeader>
        <CardContent className="flex flex-col gap-4">
          {diff.restrictions.added.map((restriction) => <div key={`add-${restriction.id}`} className="flex items-center justify-between gap-3"><span>{restriction.name}</span><Badge>Added</Badge></div>)}
          {diff.restrictions.removed.map((restriction) => <div key={`remove-${restriction.id}`} className="flex items-center justify-between gap-3"><span>{restriction.name}</span><Badge variant="destructive">Removed</Badge></div>)}
          {diff.restrictions.changed.map(({ before, after }) => <div key={`change-${after.id}`} className="flex flex-col gap-2 rounded-md border p-3"><div className="flex items-center justify-between gap-3"><span>{after.name}</span><Badge variant="secondary">Note changed</Badge></div><p className="text-sm text-muted-foreground">{before.note ?? "No note"} → {after.note ?? "No note"}</p></div>)}
        </CardContent>
      </Card>
    </div>
  )
}

export function DraftPoolEditorPage() {
  const [seasonOverride, setSeasonOverride] = useState("")
  const [busyAction, setBusyAction] = useState<string | null>(null)
  const [discardOpen, setDiscardOpen] = useState(false)
  const { data: access, error: accessError, isLoading: accessLoading, mutate: mutateAccess } = useSWR(DRAFT_POOL_EDITOR_ACCESS_KEY, draftPoolEditorAccessFetcher)
  const { data: seasons = [], isLoading: seasonsLoading } = useSWR(access?.isEditor ? DRAFT_POOL_EDITOR_SEASONS_KEY : null, draftPoolSeasonsFetcher)
  const currentSeasonId = seasons.find((season) => season.is_current)?.id ?? seasons[0]?.id ?? ""
  const seasonId = seasonOverride || currentSeasonId
  const { data: snapshot, error: snapshotError, isLoading: snapshotLoading, mutate } = useSWR(
    access?.isEditor && seasonId ? ["draft-pool-editor-snapshot", seasonId] : null,
    ([, id]) => loadDraftPoolEditorSnapshot(id),
  )

  async function runAction(label: string, action: () => Promise<unknown>) {
    setBusyAction(label)
    try {
      await action()
      await mutate()
      toast.success(label)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : `${label} failed`)
    } finally {
      setBusyAction(null)
    }
  }

  async function optimistically(
    label: string,
    transform: (current: DraftPoolEditorSnapshot) => DraftPoolEditorSnapshot,
    action: () => Promise<unknown>,
  ) {
    if (!snapshot) return
    const previous = snapshot
    await mutate(transform(snapshot), { revalidate: false })
    try {
      await action()
      toast.success(label)
      await mutate()
    } catch (error) {
      await mutate(previous, { revalidate: false })
      toast.error(error instanceof Error ? error.message : `${label} failed`)
    }
  }

  const accessView = draftPoolAccessView({ access, error: accessError, loading: accessLoading })
  if (accessView === "loading") return <div className="flex min-h-64 items-center justify-center"><Loader2 className="animate-spin" /><span className="sr-only">Checking access</span></div>
  if (accessView === "error") {
    return (
      <Card className="mx-auto max-w-xl">
        <CardHeader><CardTitle>Couldn&apos;t verify your access</CardTitle><CardDescription>Something went wrong while checking whether you can edit the draft pool. This is not a permissions decision. Try again.</CardDescription></CardHeader>
        <CardContent className="flex flex-col gap-4">
          <p className="text-sm text-destructive">{accessError instanceof Error ? accessError.message : String(accessError)}</p>
          <div><Button className="min-h-11" onClick={() => void mutateAccess()}>Retry</Button></div>
        </CardContent>
      </Card>
    )
  }
  if (accessView === "signed-out" || !access) {
    return (
      <Card className="mx-auto max-w-xl">
        <CardHeader><CardTitle>Please sign in</CardTitle><CardDescription>Sign in to use the draft pool editor.</CardDescription></CardHeader>
        <CardContent><Button asChild className="min-h-11"><Link href="/auth/login?next=/admin/draft-pool">Sign in</Link></Button></CardContent>
      </Card>
    )
  }
  if (accessView === "forbidden") {
    return (
      <Card className="mx-auto max-w-xl">
        <CardHeader><CardTitle>Not authorized</CardTitle><CardDescription>This editor is available only to draft-pool editors, league mods, and admins.</CardDescription></CardHeader>
      </Card>
    )
  }

  const pending = snapshot?.pending ?? null
  const isDraft = Boolean(pending && !pending.submitted_at)
  const isSubmitter = pending?.submitted_by === access.userId
  const isContributor = pending?.contributor_ids.includes(access.userId) ?? false
  const canApprove = Boolean(pending && (access.isAdmin || (pending.submitted_at && !isSubmitter && !isContributor)))
  const canWithdraw = Boolean(pending?.submitted_at && (access.isAdmin || isSubmitter))
  const canDiscard = Boolean(pending && (access.isAdmin || pending.created_by === access.userId))
  const error = snapshotError

  return (
    <div className="flex min-w-0 flex-col gap-6 pb-28">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="flex flex-col gap-2">
          <div className="flex flex-wrap items-center gap-2"><Badge variant="outline">Phase 2</Badge>{access.isAdmin ? <Badge>Admin</Badge> : <Badge variant="secondary">League mod</Badge>}</div>
          <h1 className="text-balance text-3xl font-bold tracking-tight">Draft Pool Editor</h1>
          <p className="max-w-3xl text-pretty text-muted-foreground">Build a versioned revision without interrupting coaches. The published pool stays live throughout editing and review.</p>
        </div>
        <div className="flex min-w-0 flex-col gap-2 sm:min-w-72">
          <label htmlFor="season-picker" className="text-sm font-medium">Season</label>
          <Select value={seasonId} onValueChange={setSeasonOverride} disabled={seasonsLoading}>
            <SelectTrigger id="season-picker" className="min-h-11 w-full"><SelectValue placeholder="Choose a season" /></SelectTrigger>
            <SelectContent><SelectGroup>{seasons.map((season) => <SelectItem key={season.id} value={season.id}>{season.name}{season.is_current ? " (current)" : ""}</SelectItem>)}</SelectGroup></SelectContent>
          </Select>
        </div>
      </div>

      <Alert>
        <ShieldCheck />
        <AlertTitle>Published pool remains live</AlertTitle>
        <AlertDescription>Starting, editing, submitting, withdrawing, or discarding a revision never takes the current pool away from coaches. Publish swaps versions atomically.</AlertDescription>
      </Alert>

      {error ? <Alert variant="destructive"><CircleAlert /><AlertTitle>Could not load this season</AlertTitle><AlertDescription>{error.message}</AlertDescription></Alert> : null}
      {snapshotLoading ? <div className="flex min-h-48 items-center justify-center"><Loader2 className="animate-spin" /><span className="sr-only">Loading draft pool</span></div> : null}

      {snapshot ? (
        <>
          <div className="grid gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader><CardTitle className="flex items-center gap-2"><CheckCircle2 /> Published</CardTitle><CardDescription>The coach-visible version.</CardDescription></CardHeader>
              <CardContent className="flex flex-col gap-2 text-sm">
                {snapshot.published ? <><p>Published: {displayDate(snapshot.published.published_at ?? snapshot.published.approved_at)}</p><p>Approved by: {displayActor(snapshot.published.approved_by)}</p><p>{snapshot.publishedEntries.length} entries · {snapshot.publishedRestrictions.length} restrictions</p></> : <p className="text-muted-foreground">No version has been published yet.</p>}
              </CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle>Pending revision</CardTitle><CardDescription>{pending ? (pending.submitted_at ? "In review — editing is frozen." : "Draft — editors may make changes.") : "No pending revision."}</CardDescription></CardHeader>
              <CardContent className="flex flex-col gap-2 text-sm">
                {pending ? <><div><Badge variant={pending.submitted_at ? "secondary" : "outline"}>{pending.submitted_at ? "In review" : "Draft"}</Badge></div><p>Submitted by: {displayActor(pending.submitted_by)}</p><p>Contributors: {pending.contributor_ids.length ? pending.contributor_ids.map(displayActor).join(", ") : "None"}</p></> : <p className="text-muted-foreground">Start from the current published pool when you are ready.</p>}
              </CardContent>
            </Card>
          </div>

          <Tabs defaultValue="pending" className="min-w-0">
            <TabsList className="grid h-auto min-h-11 w-full grid-cols-2 md:grid-cols-4">
              <TabsTrigger value="published" className="min-h-10">Published</TabsTrigger>
              <TabsTrigger value="pending" className="min-h-10">Pending</TabsTrigger>
              <TabsTrigger value="changes" className="min-h-10">Changes</TabsTrigger>
              <TabsTrigger value="restrictions" className="min-h-10">Restrictions</TabsTrigger>
            </TabsList>
            <TabsContent value="published" className="pt-4"><EntryList entries={snapshot.publishedEntries} editable={false} /></TabsContent>
            <TabsContent value="pending" className="pt-4">
              {pending ? (
                <EntryList
                  entries={snapshot.pendingEntries}
                  editable={isDraft}
                  versionId={pending.id}
                  onUpdate={(entry, values) => optimistically("Entry updated", (current) => ({ ...current, pendingEntries: current.pendingEntries.map((candidate) => candidate.id === entry.id ? { ...candidate, ...values, is_effective_tera_ban: values.tera_banned && values.points <= 10 } : candidate) }), () => updateDraftPoolEntry(entry.id, values))}
                  onRemove={(entry) => optimistically("Entry removed", (current) => ({ ...current, pendingEntries: current.pendingEntries.filter((candidate) => candidate.id !== entry.id) }), () => removeDraftPoolEntry(entry.id))}
                  onAdd={(entry) => runAction("Entry added", () => addDraftPoolEntry(entry))}
                />
              ) : <Card><CardContent className="py-8 text-center text-sm text-muted-foreground">No pending revision. Use Start revision below.</CardContent></Card>}
            </TabsContent>
            <TabsContent value="changes" className="pt-4"><ChangesPanel snapshot={snapshot} /></TabsContent>
            <TabsContent value="restrictions" className="pt-4">
              <RestrictionsPanel
                versionId={pending?.id}
                entries={pending ? snapshot.pendingEntries : snapshot.publishedEntries}
                restrictions={pending ? snapshot.pendingRestrictions : snapshot.publishedRestrictions}
                editable={isDraft}
                onAdd={(restriction) => runAction("Restriction added", () => addDraftPoolRestriction(restriction))}
                onRemove={(restriction: DraftPoolRestrictionSnapshot) => optimistically("Restriction removed", (current) => ({ ...current, pendingRestrictions: current.pendingRestrictions.filter((candidate) => candidate.id !== restriction.id) }), () => removeDraftPoolRestriction(restriction.id))}
              />
            </TabsContent>
          </Tabs>
        </>
      ) : null}

      <div className="fixed inset-x-0 bottom-0 border-t bg-background/95 p-3 backdrop-blur supports-[backdrop-filter]:bg-background/80 md:left-[var(--sidebar-width)]">
        <div className="mx-auto flex max-w-screen-2xl flex-wrap items-center justify-end gap-2">
          {!pending && seasonId ? <Button className="min-h-11" disabled={Boolean(busyAction)} onClick={() => void runAction("Revision started", () => startDraftPoolRevision(seasonId))}><GitCompareArrows data-icon="inline-start" />Start revision</Button> : null}
          {pending && isDraft && !access.isAdmin ? <Button className="min-h-11" disabled={Boolean(busyAction)} onClick={() => void runAction("Submitted for review", () => submitDraftPoolRevision(pending.id))}><Send data-icon="inline-start" />Submit for review</Button> : null}
          {canWithdraw && pending ? <Button variant="outline" className="min-h-11" disabled={Boolean(busyAction)} onClick={() => void runAction("Revision withdrawn", () => withdrawDraftPoolRevision(pending.id))}><Undo2 data-icon="inline-start" />Withdraw</Button> : null}
          {canApprove && pending ? <Button className="min-h-11" disabled={Boolean(busyAction)} onClick={() => void runAction("Revision published", () => publishDraftPoolRevision(pending.id))}><ShieldCheck data-icon="inline-start" />Approve &amp; publish</Button> : null}
          {canDiscard && pending ? (
            <Dialog open={discardOpen} onOpenChange={setDiscardOpen}>
              <DialogTrigger asChild><Button variant="destructive" className="min-h-11" disabled={Boolean(busyAction)}><Trash2 data-icon="inline-start" />Discard revision</Button></DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>Discard this revision?</DialogTitle><DialogDescription>The pending revision will be archived. The current published pool will remain live and unchanged.</DialogDescription></DialogHeader>
                <DialogFooter><DialogClose asChild><Button variant="outline">Cancel</Button></DialogClose><Button variant="destructive" onClick={() => { setDiscardOpen(false); void runAction("Revision discarded", () => discardDraftPoolRevision(pending.id)) }}>Discard revision</Button></DialogFooter>
              </DialogContent>
            </Dialog>
          ) : null}
        </div>
      </div>
    </div>
  )
}
