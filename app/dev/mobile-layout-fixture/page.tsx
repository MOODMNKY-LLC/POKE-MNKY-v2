import { notFound } from "next/navigation"
import { MobileLayoutFixtureClient } from "./fixture-client"

/**
 * Layout fixture for mobile polish verification.
 * Available locally and on Vercel Preview; 404 on Vercel Production so it is not
 * a public production surface. Uses mock card data only (no live league data).
 */
export default function MobileLayoutFixturePage() {
  if (process.env.VERCEL_ENV === "production") {
    notFound()
  }

  return <MobileLayoutFixtureClient />
}
