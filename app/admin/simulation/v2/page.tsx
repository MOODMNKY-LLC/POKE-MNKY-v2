import { redirect } from "next/navigation"

/** Legacy path from early v0 drop — keep bookmark-safe redirect to demo operator route. */
export default function AdminSimulationV2Redirect() {
  redirect("/demo/season-sim")
}
