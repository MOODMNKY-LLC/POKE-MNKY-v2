import type { DraftPoolEditorAccess } from "@/lib/draft-pool-builder/editor-client"

export type DraftPoolAccessView =
  | "loading"
  | "error"
  | "signed-out"
  | "forbidden"
  | "ok"

/**
 * Decides which screen the draft-pool editor shows. A failed access check is
 * never reported as "forbidden": only a successful check that says the user is
 * not an editor is.
 */
export function draftPoolAccessView({
  access,
  error,
  loading,
}: {
  access: DraftPoolEditorAccess | null | undefined
  error: unknown
  loading: boolean
}): DraftPoolAccessView {
  if (loading) return "loading"
  if (error) return "error"
  if (access === undefined) return "loading"
  if (access === null) return "signed-out"
  return access.isEditor ? "ok" : "forbidden"
}
