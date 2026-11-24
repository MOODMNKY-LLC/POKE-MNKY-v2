import { notFound } from "next/navigation"
import { createServerClient } from "@/lib/supabase/server"
import { knowledgeEnabled, knowledgeRole } from "@/lib/aab-knowledge/gate"
import { AabDrafts } from "@/components/ai/aab-drafts"

export default async function AabDraftsPage() {
  if (!knowledgeEnabled()) notFound()
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) notFound()
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle()
  if (knowledgeRole(profile?.role) !== "maus") notFound()
  return <AabDrafts />
}
