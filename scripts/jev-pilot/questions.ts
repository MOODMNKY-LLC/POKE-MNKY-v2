import { choice, noul } from "@typesafe-ai/sdk"

/** Shared System One questions for the Discord result pilot. */
export function jevPilotQuestions() {
  return {
    message_class: choice(
      "Classify this Discord league message. Prefer 'result' only when it reports a completed match score or winner.",
      {
        result: "Reports a finished match with a winner and/or score (e.g. Team A wins 2-0 vs Team B).",
        trade: "Trade offer, trade acceptance, or roster swap discussion.",
        fa_request: "Free agency pickup, drop, or claim request.",
        question: "A question to the league or organizers, not announcing a result.",
        other: "Anything else (scheduling, banter, rules chat, admin notes).",
      },
    ),
    needs_organizer_review: noul(
      "Does this message look like a rule violation, dispute, forfeit edge-case, or other issue that needs an organizer review (not a clean OK result)?",
    ),
    score_winner_consistent: noul(
      "If this message states a winner and a score, are the stated score and winner consistent with each other and with the text? Answer yes when consistent or when there is no score/winner claim; answer no when they contradict.",
    ),
  }
}

export type JevPilotAnswers = {
  message_class: { choice: string; confidence?: number }
  needs_organizer_review: { noul: number }
  score_winner_consistent: { noul: number }
}
