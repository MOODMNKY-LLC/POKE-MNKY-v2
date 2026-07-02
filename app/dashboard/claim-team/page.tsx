import { redirect } from "next/navigation"

/** Legacy route — league team linking lives under /dashboard/league-team */
export default function ClaimTeamRedirectPage() {
  redirect("/dashboard/league-team?claim=1")
}
