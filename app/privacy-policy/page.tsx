import type { Metadata } from "next"
import Link from "next/link"

export const metadata: Metadata = {
  title: "Privacy Policy | POKE MNKY",
  description: "Privacy Policy for the POKE MNKY / Average at Best Battle League platform.",
}

export default function PrivacyPolicyPage() {
  return (
    <div className="container mx-auto max-w-3xl px-4 py-12">
      <h1 className="font-marker text-3xl font-bold tracking-tight">Privacy Policy</h1>
      <p className="mt-2 text-muted-foreground">Last updated: March 2026</p>

      <div className="prose prose-neutral dark:prose-invert mt-8 space-y-6">
        <section>
          <h2 className="text-xl font-semibold">1. Overview</h2>
          <p>
            This Privacy Policy describes how we collect, use, and protect information when you use the POKE MNKY platform and the Average at Best Battle League services (the &quot;Service&quot;).
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold">2. Information We Collect</h2>
          <p>
            We collect information you provide (e.g. account details, Discord link, league-related data such as draft picks and trades) and automatically collected data (e.g. IP address, usage) necessary to operate the Service. When you link Discord, we receive your Discord user ID and related profile information as permitted by Discord and your consent.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold">3. How We Use Information</h2>
          <p>
            We use collected information to provide and improve the Service, enforce league rules, communicate with you, and comply with legal obligations. We do not sell your personal information.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold">4. Sharing</h2>
          <p>
            We may share information with league commissioners and moderators as needed to run the league, with service providers (e.g. hosting, analytics) under confidentiality obligations, and when required by law.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold">5. Data Retention and Security</h2>
          <p>
            We retain data as long as needed for the Service and legal purposes. We use reasonable technical and organizational measures to protect your data; no system is completely secure.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold">6. Your Rights</h2>
          <p>
            Depending on your jurisdiction, you may have rights to access, correct, delete, or port your data, or to object to or restrict processing. Contact us using the method provided in the app or Discord server to exercise these rights.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold">7. Changes</h2>
          <p>
            We may update this Privacy Policy from time to time. The &quot;Last updated&quot; date at the top will change when we do. Continued use of the Service after changes constitutes acceptance of the updated policy.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold">8. Contact</h2>
          <p>
            For privacy-related questions, contact the league administrators or the contact method provided in the Discord server or app.
          </p>
        </section>
      </div>

      <p className="mt-10">
        <Link href="/" className="text-primary underline underline-offset-4">
          Back to home
        </Link>
        {" · "}
        <Link href="/terms-of-service" className="text-primary underline underline-offset-4">
          Terms of Service
        </Link>
      </p>
    </div>
  )
}
