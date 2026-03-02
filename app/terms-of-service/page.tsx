import type { Metadata } from "next"
import Link from "next/link"

export const metadata: Metadata = {
  title: "Terms of Service | POKE MNKY",
  description: "Terms of Service for the POKE MNKY / Average at Best Battle League platform.",
}

export default function TermsOfServicePage() {
  return (
    <div className="container mx-auto max-w-3xl px-4 py-12">
      <h1 className="font-marker text-3xl font-bold tracking-tight">Terms of Service</h1>
      <p className="mt-2 text-muted-foreground">Last updated: March 2026</p>

      <div className="prose prose-neutral dark:prose-invert mt-8 space-y-6">
        <section>
          <h2 className="text-xl font-semibold">1. Acceptance</h2>
          <p>
            By using the POKE MNKY platform and the Average at Best Battle League services (the &quot;Service&quot;), you agree to these Terms of Service. If you do not agree, do not use the Service.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold">2. Description of Service</h2>
          <p>
            The Service provides a Pokémon draft league management platform, including draft tools, trade and free agency workflows, Discord integration, battle and standings tracking, and related features. We may change or discontinue features with reasonable notice where practical.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold">3. Eligibility and Accounts</h2>
          <p>
            You must be at least 13 years old to use the Service. You are responsible for keeping your account credentials and linked Discord account secure. You may not share accounts or use the Service in violation of applicable laws or league rules.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold">4. Acceptable Use</h2>
          <p>
            You agree not to use the Service to harass others, cheat in league play, automate abuse (e.g. scraping or bots except as permitted), or violate Discord or third-party terms. We may suspend or terminate access for violations.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold">5. Privacy</h2>
          <p>
            Use of the Service is also governed by our{" "}
            <Link href="/privacy-policy" className="text-primary underline underline-offset-4">
              Privacy Policy
            </Link>
            . By using the Service you consent to the collection and use of information as described there.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold">6. Disclaimer</h2>
          <p>
            The Service is provided &quot;as is&quot; without warranties of any kind. We do not guarantee uninterrupted or error-free operation. We are not responsible for decisions made by league commissioners or for outcomes of battles or trades.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold">7. Contact</h2>
          <p>
            For questions about these Terms, contact the league administrators or the contact method provided in the Discord server or app.
          </p>
        </section>
      </div>

      <p className="mt-10">
        <Link href="/" className="text-primary underline underline-offset-4">
          Back to home
        </Link>
      </p>
    </div>
  )
}
