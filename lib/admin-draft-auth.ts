import { createClient } from "@/lib/supabase/server"

export type DraftStaffRole = "admin" | "commissioner"

export async function getDraftStaffProfile(): Promise<
  | { ok: true; userId: string; role: DraftStaffRole }
  | { ok: false; status: number; error: string }
> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { ok: false, status: 401, error: "Unauthorized" }
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single()

  if (profile?.role !== "admin" && profile?.role !== "commissioner") {
    return { ok: false, status: 403, error: "Forbidden" }
  }

  return { ok: true, userId: user.id, role: profile.role as DraftStaffRole }
}
