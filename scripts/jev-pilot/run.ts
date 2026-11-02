/**
 * Jev pilot harness — flags only, no live wiring.
 *
 * Runs TypeSafe Jev (System One) over Discord result fixtures and writes
 * docs/reviews/jev-pilot-results.md. Skips cleanly when no provider key is set.
 *
 * Usage: pnpm jev:pilot
 */

import { readFileSync, writeFileSync, mkdirSync } from "node:fs"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"
import {
  createJevClient,
  missingProviderMessage,
  resolveJevProvider,
} from "./provider"
import { jevPilotQuestions } from "./questions"

type FixtureMessage = {
  fixture_id: string
  content: string
  author: string
  is_result: boolean
  expected: {
    winner?: string
    loser?: string
    score?: [number, number]
    flag?: string
  } | null
}

type FixtureFile = {
  messages: FixtureMessage[]
}

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = join(__dirname, "../..")
const FIXTURE = join(ROOT, "fixtures/s7-battle-results.anon.json")
const REPORT = join(ROOT, "docs/reviews/jev-pilot-results.md")
const NOUL_YES = 0.5

function loadFixtures(): FixtureMessage[] {
  const raw = JSON.parse(readFileSync(FIXTURE, "utf8")) as FixtureFile
  return raw.messages
}

function confusionTable(
  labels: string[],
  pairs: Array<{ actual: string; predicted: string }>,
): string {
  const matrix = new Map<string, Map<string, number>>()
  for (const a of labels) {
    matrix.set(a, new Map(labels.map((p) => [p, 0])))
  }
  for (const { actual, predicted } of pairs) {
    const row = matrix.get(actual) ?? new Map()
    row.set(predicted, (row.get(predicted) ?? 0) + 1)
    matrix.set(actual, row)
  }
  const header = ["actual\\pred", ...labels].join(" | ")
  const sep = ["---", ...labels.map(() => "---")].join("|")
  const rows = labels.map((a) => {
    const row = matrix.get(a)!
    return [a, ...labels.map((p) => String(row.get(p) ?? 0))].join(" | ")
  })
  return ["| " + header + " |", "|" + sep + "|", ...rows.map((r) => "| " + r + " |")].join(
    "\n",
  )
}

async function main(): Promise<void> {
  const provider = resolveJevProvider()
  if (!provider) {
    console.error(missingProviderMessage())
    process.exitCode = 0
    mkdirSync(dirname(REPORT), { recursive: true })
    writeFileSync(
      REPORT,
      [
        "# Jev pilot results",
        "",
        "_Placeholder — harness was not run (no provider credentials)._",
        "",
        "Set `AI_GATEWAY_API_KEY` / `VERCEL_OIDC_TOKEN`, `OPENROUTER_API_KEY`, or `TYPESAFE_API_KEY`, then run `pnpm jev:pilot`.",
        "",
        "See `scripts/jev-pilot/README.md`.",
        "",
      ].join("\n"),
      "utf8",
    )
    return
  }

  const client = createJevClient(provider)
  const messages = loadFixtures()
  const questions = jevPilotQuestions()

  console.log(
    `Jev pilot: provider=${provider.id} model=${provider.model} fixtures=${messages.length}`,
  )

  const classPairs: Array<{ actual: string; predicted: string }> = []
  let classCorrect = 0
  let reviewCorrect = 0
  let reviewTotal = 0
  let consistentCorrect = 0
  let consistentTotal = 0
  const rows: string[] = []

  for (const msg of messages) {
    const state = {
      author: msg.author,
      content: msg.content,
      fixture_id: msg.fixture_id,
    }

    try {
      const { answers } = await client.systemOne({
        model: provider.model,
        state,
        questions,
      })

      const predictedClass = String(answers.message_class.choice)
      const actualClass = msg.is_result ? "result" : "other"
      // Map non-result gold to a soft bucket: gold only labels is_result boolean.
      const predictedForConf =
        predictedClass === "result" ? "result" : "other"
      classPairs.push({ actual: actualClass, predicted: predictedForConf })
      if (predictedForConf === actualClass) classCorrect += 1

      const needsReview = answers.needs_organizer_review.noul >= NOUL_YES
      const goldNeedsReview =
        msg.is_result &&
        !!msg.expected?.flag &&
        msg.expected.flag !== "OK" &&
        msg.expected.flag !== "OK_MARGIN_ADVISORY"
      if (msg.is_result) {
        reviewTotal += 1
        if (needsReview === goldNeedsReview) reviewCorrect += 1
      }

      const scoreOk = answers.score_winner_consistent.noul >= NOUL_YES
      if (msg.is_result && msg.expected?.score && msg.expected.winner) {
        consistentTotal += 1
        // Gold: fixture expected parse succeeded → text was treated as consistent.
        if (scoreOk) consistentCorrect += 1
      }

      rows.push(
        `| ${msg.fixture_id} | ${msg.is_result} | ${predictedClass} | ${answers.needs_organizer_review.noul.toFixed(2)} | ${answers.score_winner_consistent.noul.toFixed(2)} | ${msg.expected?.flag ?? "—"} |`,
      )
    } catch (error) {
      const err = error instanceof Error ? error.message : String(error)
      console.error(`  fail ${msg.fixture_id}: ${err}`)
      rows.push(
        `| ${msg.fixture_id} | ${msg.is_result} | ERROR | — | — | ${msg.expected?.flag ?? "—"} |`,
      )
    }
  }

  const classAcc = messages.length ? classCorrect / messages.length : 0
  const reviewAcc = reviewTotal ? reviewCorrect / reviewTotal : 0
  const consistentAcc = consistentTotal ? consistentCorrect / consistentTotal : 0

  const report = [
    "# Jev pilot results",
    "",
    `Generated: ${new Date().toISOString()}`,
    "",
    `Provider: **${provider.label}** (\`${provider.id}\`)`,
    `Model: \`${provider.model}\``,
    `Base URL: \`${provider.baseURL}\``,
    `Fixtures: \`${FIXTURE}\` (${messages.length} messages, ${messages.filter((m) => m.is_result).length} labeled results)`,
    "",
    "## Accuracy",
    "",
    `| Task | Metric | Value |`,
    `| --- | --- | --- |`,
    `| Message class (result vs other) | accuracy | ${(classAcc * 100).toFixed(1)}% (${classCorrect}/${messages.length}) |`,
    `| Organizer review (result rows) | accuracy vs non-OK flags | ${(reviewAcc * 100).toFixed(1)}% (${reviewCorrect}/${reviewTotal}) |`,
    `| Score/winner consistency (result rows with expected score) | model yes-rate | ${(consistentAcc * 100).toFixed(1)}% (${consistentCorrect}/${consistentTotal}) |`,
    "",
    "## Confusion (result vs other)",
    "",
    confusionTable(["result", "other"], classPairs),
    "",
    "## Per-fixture",
    "",
    "| fixture_id | is_result | predicted_class | needs_review (noul) | score_consistent (noul) | gold flag |",
    "| --- | --- | --- | --- | --- | --- |",
    ...rows,
    "",
    "## Notes",
    "",
    "- Gold class is only `is_result` boolean → collapsed to result/other for the confusion table.",
    "- Organizer-review gold treats flags other than `OK` / `OK_MARGIN_ADVISORY` as needing review.",
    "- This report is offline pilot output; nothing is wired into live Discord parse.",
    "",
  ].join("\n")

  mkdirSync(dirname(REPORT), { recursive: true })
  writeFileSync(REPORT, report, "utf8")
  console.log(`Wrote ${REPORT}`)
  console.log(
    `class_acc=${(classAcc * 100).toFixed(1)}% review_acc=${(reviewAcc * 100).toFixed(1)}% consistent_yes=${(consistentAcc * 100).toFixed(1)}%`,
  )
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
